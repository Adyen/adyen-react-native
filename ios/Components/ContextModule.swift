//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenContext)
internal final class ContextModule: BaseModule {

    /// Pre-built payment components keyed by payment method type, populated by
    /// ``requiresUserInteraction(_:resolver:rejecter:)`` and reused by ``submit(_:)``.
    private var components: [String: CheckoutPaymentComponent] = [:]

    // MARK: - Advanced-flow callback state

    /// Suspends the advanced-flow `onSubmit` closure until JS forwards a result via
    /// ``action(_:)`` / ``completion(_:)`` / ``retry(_:)``.
    internal var submitContinuation: CheckedContinuation<SubmitResult, Never>?

    /// Suspends the advanced-flow `onAdditionalDetails` closure until JS forwards a result via
    /// ``completion(_:)``.
    internal var additionalDetailsContinuation: CheckedContinuation<AdditionalDetailsResult, Never>?

    // MARK: - Apple Pay callback state

    /// Continuations for the v6 Apple Pay closures. Each is set when the SDK invokes the
    /// matching closure and consumed by the corresponding `provide…` method once JS responds.
    /// Stored on the class because Swift extensions cannot declare stored properties.
    internal var shippingContactHandler: ((PKPaymentRequestShippingContactUpdate) -> Void)?
    internal var shippingMethodHandler: ((PKPaymentRequestShippingMethodUpdate) -> Void)?
    internal var authorizationHandler: ((PKPaymentAuthorizationResult) -> Void)?
    private var _couponCodeHandler: Any?
    @available(iOS 15.0, *)
    internal var couponCodeHandler: ((PKPaymentRequestCouponCodeUpdate) -> Void)? {
        get { _couponCodeHandler as? (PKPaymentRequestCouponCodeUpdate) -> Void }
        set { _couponCodeHandler = newValue }
    }

    /// The summary items currently shown in the Apple Pay sheet. v6 delivers them on every
    /// shipping / coupon callback, so they are stored here to serve as a fallback when a
    /// JS-provided update omits its own summary items.
    internal var currentSummaryItems: [PKPaymentSummaryItem] = []
    internal var currentShippingMethods: [PKShippingMethod] = []

    override func supportedEvents() -> [String]! {
        (EventName.coreEvents + EventName.sessionEvents + EventName.applePayEvents).map(\.rawValue)
    }

    /// Forwards a JS-provided action into a suspended advanced-flow `onSubmit` closure so the SDK
    /// can present it (e.g. 3DS). No-op when no submit is pending.
    @objc
    func action(_ actionJson: NSDictionary) {
        ensureMainThread { [weak self] in
            guard let self, self.submitContinuation != nil else { return }
            do {
                let action = try self.parseAction(from: actionJson)
                self.resolveSubmit(.action(action))
            } catch {
                self.sendError(error: error)
            }
        }
    }

    @objc
    override func completion(_ resultCode: NSString) {
        ensureMainThread { [weak self] in
            guard let self else { return }
            // Advanced flow: resolve the suspended SDK closure instead of tearing the context down.
            if self.submitContinuation != nil {
                self.resolveSubmit(.completion(resultCode: resultCode as String))
                return
            }
            if self.additionalDetailsContinuation != nil {
                self.resolveAdditionalDetails(.completion(resultCode: resultCode as String))
                return
            }
        }
    }

    @objc
    override func retry(_ message: NSString) {
        ensureMainThread { [weak self] in
            guard let self else { return }
            if self.submitContinuation != nil {
                let msg = message as String
                self.resolveSubmit(.retry(errorMessage: msg.isEmpty ? nil : msg))
                return
            }
        }
    }

    @objc
    func setSdkVersion(_ sdkVersion: String) {
        BaseModule.sdkVersion = sdkVersion
    }

    @objc
    func setup(_ sessionModelJSON: NSDictionary,
               configuration: NSDictionary,
               resolver: @escaping RCTPromiseResolveBlock,
               rejecter: @escaping RCTPromiseRejectBlock) {
        guard let id = sessionModelJSON[Key.id] as? String,
              let sessionData = sessionModelJSON[Key.sessionData] as? String else {
            return rejecter("session", "Invalid session data", nil)
        }

        let parser = RootConfigurationParser(configuration: configuration)

        Task { @MainActor [weak self] in
            guard let self else { return }
            // Re-setup: clear stale components and continuations without calling cleanUp().
            // The native side replaces its own state when the new setup completes.
            self.components.removeAll()
            self.submitContinuation?.resume(returning: .retry())
            self.submitContinuation = nil
            self.additionalDetailsContinuation?.resume(returning: .completion(resultCode: ""))
            self.additionalDetailsContinuation = nil
            do {
                let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                let sessionResponse = SessionResponse(id: id, sessionData: sessionData)
                let checkout = try await Checkout.setup(
                    with: sessionResponse,
                    configuration: checkoutConfiguration,
                    presentationDelegate: self
                )
                self.setupSessionCallbacks(on: checkout, sessionData: sessionData)

                guard let paymentMethods = checkout.paymentMethods else {
                    return rejecter("session", "No payment methods available for the session", nil)
                }

                BaseModule.checkoutState = CheckoutState(checkoutContext: checkout)

                let dto = SessionDTO(id: id, sessionData: sessionData, paymentMethods: paymentMethods)
                resolver(dto.jsonObject)
            } catch {
                rejecter("session", nil, error)
            }
        }
    }

    /// Sets up an ``AdvancedCheckout`` for the advanced (merchant-managed) flow and wires its
    /// lifecycle closures (`onSubmit`, `onAdditionalDetails`, `onComplete`, `onFailure`) to the
    /// React Native events consumed by the hook. The checkout context is stored on ``BaseModule``
    /// so downstream modules and headless ``submit(_:)`` can reuse it.
    @objc
    func setupAdvanced(_ paymentMethodsDict: NSDictionary,
                       configuration: NSDictionary,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethods: PaymentMethods
        do {
            paymentMethods = try parsePaymentMethods(from: paymentMethodsDict)
        } catch {
            return rejecter("setup", "Invalid payment methods", error)
        }

        Task { @MainActor [weak self] in
            guard let self else { return }
            // Re-setup: clear stale components and continuations without calling cleanUp().
            // The native side replaces its own state when the new setup completes.
            self.components.removeAll()
            self.submitContinuation?.resume(returning: .retry())
            self.submitContinuation = nil
            self.additionalDetailsContinuation?.resume(returning: .completion(resultCode: ""))
            self.additionalDetailsContinuation = nil
            do {
                let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                let checkout = try await Checkout.setup(
                    with: paymentMethods,
                    configuration: checkoutConfiguration,
                    presentationDelegate: self
                )
                self.setupAdvancedCallbacks(on: checkout)
                BaseModule.checkoutState = CheckoutState(checkoutContext: checkout)
                resolver(true)
            } catch {
                rejecter("setup", nil, error)
            }
        }
    }

    // MARK: - Headless APIs

    @objc
    func isAvailable(_ type: NSString,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter _: @escaping RCTPromiseRejectBlock) {
        let typeString = type as String
        Task { @MainActor in
            guard let state = BaseModule.checkoutState else {
                print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
                return resolver(false)
            }
            let checkout = state.checkoutContext
            guard let paymentMethodType = PaymentMethodType(rawValue: typeString) else {
                return resolver(false)
            }

            switch paymentMethodType {
            case .googlePay:
                // Google Pay is not available on iOS.
                resolver(false)
            case .applePay:
                let hasApplePay = checkout.paymentMethods?.paymentMethod(ofType: .applePay) != nil
                resolver(hasApplePay && PKPaymentAuthorizationViewController.canMakePayments())
            default:
                resolver(checkout.paymentMethods?.paymentMethod(ofType: paymentMethodType) != nil)
            }
        }
    }

    @objc
    func requiresUserInteraction(_ type: NSString,
                                 resolver: @escaping RCTPromiseResolveBlock,
                                 rejecter: @escaping RCTPromiseRejectBlock) {
        let typeString = type as String
        Task { @MainActor [weak self] in
            guard let self else { return }
            guard let state = BaseModule.checkoutState else {
                print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
                return rejecter("context", "Checkout context is not initialized", nil)
            }
            let checkout = state.checkoutContext
            do {
                let component = try self.resolveComponent(for: typeString, checkout: checkout)
                resolver(component.requiresUserInteraction)
            } catch {
                rejecter("requiresUserInteraction", nil, error)
            }
        }
    }

    @objc
    func submit(_ type: NSString) {
        let typeString = type as String
        Task { @MainActor [weak self] in
            guard let self else { return }
            guard let state = BaseModule.checkoutState else {
                print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
                return
            }
            let checkout = state.checkoutContext
            do {
                let component = try self.resolveComponent(for: typeString, checkout: checkout)
                component.submit()
            } catch {
                self.sendError(error: error)
            }
        }
    }

    /// Called from JS terminal callbacks (onComplete / onError) via performAutoCleanup().
    @objc
    func cleanup() {
        ensureMainThread { [weak self] in
            self?.performCleanup()
        }
    }

    /// Clears all per-setup state: cached components, any suspended advanced-flow closures, and the
    /// shared checkout context / presenter stack. Invoked on `cleanup()` and at the start of
    /// ``setup(_:configuration:resolver:rejecter:)`` / ``createSession(_:configuration:resolver:rejecter:)``
    /// so a re-setup never reuses stale controllers or a dangling continuation.
    @MainActor
    private func performCleanup() {
        components.removeAll()
        submitContinuation?.resume(returning: .retry())
        submitContinuation = nil
        additionalDetailsContinuation?.resume(returning: .completion(resultCode: ""))
        additionalDetailsContinuation = nil
        cleanUp()
    }

    /// Returns (building and caching if needed) the payment component for [type] within [checkout].
    @MainActor
    private func resolveComponent(for type: String, checkout: PaymentCheckout) throws -> CheckoutPaymentComponent {
        if let existing = components[type] {
            return existing
        }
        guard let paymentMethodType = PaymentMethodType(rawValue: type) else {
            throw ModuleException.invalidPaymentMethods
        }
        let component = try checkout.createPaymentComponent(for: paymentMethodType)
        components[type] = component
        return component
    }

    // MARK: - Configuration

    private func buildCheckoutConfiguration(parser: RootConfigurationParser,
                                            configuration: NSDictionary) throws -> CheckoutConfiguration {
        let cardConfiguration = CardConfigurationParser(configuration: configuration).configuration
        let authenticationConfiguration = ThreeDS2ConfigurationParser(configuration: configuration).configuration

        // Apple Pay only contributes a component configuration when the merchant supplied one;
        // the DSL cannot mix an optional entry with the required ones, so branch on its presence.
        if let applePayConfiguration = try makeApplePayConfiguration(parser: parser, configuration: configuration) {
            return try parser.checkoutConfiguration {
                cardConfiguration
                authenticationConfiguration
                applePayConfiguration
            }
        }

        return try parser.checkoutConfiguration {
            cardConfiguration
            authenticationConfiguration
        }
    }

    // MARK: - Session callbacks

    /// Wires the v6 ``SessionCheckout`` closures to the React Native session events.
    /// Replaces the removed v5 session delegate conformance.
    @MainActor
    private func setupSessionCallbacks(on checkout: SessionCheckout, sessionData: String) {
        _ = checkout
            .onComplete { [weak self] result in
                self?.sendCompleteEvent(result: result, sessionData: sessionData)
            }
            .onFailure { [weak self] error in
                self?.sendError(error: error)
            }
    }

    private func sendCompleteEvent(result: SessionCheckoutResult, sessionData: String) {
        var dict = result.jsonObject
        dict[Key.sessionId] = result.sessionId
        dict[Key.sessionData] = sessionData
        sendEvent(withName: EventName.completeSession.rawValue, body: dict)
    }

    override func sendError(error: any Error) {
        let errorToSend = checkErrorType(error)
        // Session errors surface on `failSession`; advanced-flow errors on `fail`.
        let eventName: EventName = BaseModule.checkoutState?.isSession == true ? .failSession : .fail
        sendEvent(withName: eventName.rawValue, body: errorToSend.jsonObject)
    }

    private enum Key {
        static let id = "id"
        static let sessionData = "sessionData"
        static let sessionId = "sessionId"
    }
}
