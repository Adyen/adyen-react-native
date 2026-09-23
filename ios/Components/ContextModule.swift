//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCard
import AdyenCheckout
import Foundation
import PassKit
import React

internal final class ContextModule: BaseModule {

    /// Module JS subscribes to, so a mounted ``ComponentProxy`` can surface errors on it. Weak: the bridge owns the module.
    internal private(set) weak static var shared: ContextModule?
    private let lifecycleOwnerID = UUID().uuidString

    override init() {
        super.init()
        MainActor.assumeIsolated {
            Self.shared = self
        }
    }

    /// React context teardown may happen without a JS terminal callback. Native still owns the
    /// active flow and must settle it before the bridge disappears.
    override func invalidate() {
        super.invalidate()
        ensureMainThread {
            Task { @MainActor in
                await CheckoutCoordinator.shared.hostDidDisappear(ownerID: self.lifecycleOwnerID)
            }
        }
    }

    // MARK: - Advanced-flow callback state

    /// Suspended advanced-flow closures, resumed when JS calls `action(_:)` / `completion(_:)` / `retry(_:)`.
    internal let resultSink = AdvancedResultSink()

    private let beforeSubmitBridge = CallbackBridge<BeforeSubmitResult>()
    /// `BeforeSubmitData` has no public initializer, so we stash the SDK's instance here and mutate it in place instead of constructing a new one.
    private var pendingBeforeSubmitData: BeforeSubmitData?

    // MARK: - Apple Pay callback state

    /// Suspended Apple Pay closures, resumed by the matching `provide…` method once JS responds.
    internal let authorizationBridge = CallbackBridge<PKPaymentAuthorizationResult>()
    internal let shippingContactBridge = CallbackBridge<PKPaymentRequestShippingContactUpdate>()
    internal let shippingMethodBridge = CallbackBridge<PKPaymentRequestShippingMethodUpdate>()
    internal let couponCodeBridge = CallbackBridge<PKPaymentRequestCouponCodeUpdate>()

    /// Summary items currently shown in the Apple Pay sheet; fallback when a JS-provided update omits its own.
    internal var currentSummaryItems: [PKPaymentSummaryItem] = []
    internal var currentShippingMethods: [PKShippingMethod] = []

    override func supportedEvents() -> [String]! {
        (EventName.coreEvents + EventName.sessionEvents + EventName.applePayEvents + EventName.cardEvents).map(\.rawValue)
    }

    /// Forwards a JS-provided action into a suspended advanced-flow `onSubmit` closure so the SDK
    /// can present it (e.g. 3DS). No-op when no submit is pending.
    @objc
    func action(_ actionJson: NSDictionary) {
        ensureMainThread { [weak self] in
            guard let self, self.resultSink.isAwaitingSubmit else { return }
            do {
                let action = try self.parseAction(from: actionJson)
                self.resultSink.resolveSubmit(.action(action))
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
            if self.resultSink.isAwaitingSubmit {
                self.resultSink.resolveSubmit(.completion(resultCode: resultCode as String))
                return
            }
            if self.resultSink.isAwaitingAdditionalDetails {
                self.resultSink.resolveAdditionalDetails(.completion(resultCode: resultCode as String))
                return
            }
        }
    }

    @objc
    override func retry(_ message: NSString) {
        ensureMainThread { [weak self] in
            guard let self else { return }
            if self.resultSink.isAwaitingSubmit {
                let msg = message as String
                self.resultSink.resolveSubmit(.retry(errorMessage: msg.isEmpty ? nil : msg))
                return
            }
        }
    }

    @objc
    func provideBeforeSubmitResult(_ result: NSDictionary) {
        ensureMainThread { [weak self] in
            guard let self else { return }
            do {
                try self.beforeSubmitBridge.resolve(self.parseBeforeSubmitResult(result))
            } catch {
                self.sendError(error: error)
                self.beforeSubmitBridge.resolve(.abort)
            }
        }
    }

    @objc
    func setSdkVersion(_ sdkVersion: String) {
        BaseModule.sdkVersion = sdkVersion
    }

    /// The generated Checkout module uses this private adapter only to bind a committed
    /// coordinator flow to its opaque bridge descriptor. It never surfaces the identity to JS.
    @objc
    func committedCheckoutID() -> String? {
        CheckoutCoordinator.shared.checkoutID
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
            do {
                let checkoutID = try await CheckoutCoordinator.shared.setup(ownerID: self.lifecycleOwnerID) {
                    let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                    let sessionResponse = SessionResponse(id: id, sessionData: sessionData)
                    let checkout = try await Checkout.setup(
                        with: sessionResponse,
                        configuration: checkoutConfiguration,
                        presentationDelegate: self
                    )
                    guard checkout.paymentMethods != nil else {
                        throw ModuleException.invalidPaymentMethods
                    }
                    self.setupSessionCallbacks(on: checkout, sessionData: sessionData)
                    return NativeCheckoutFlow(checkoutContext: checkout) { [weak self] in
                        self?.cancelPendingOperations()
                        self?.cleanUp()
                    }
                }

                guard let paymentMethods = CheckoutCoordinator.shared.checkoutState?.checkoutContext.paymentMethods else {
                    throw ModuleException.invalidPaymentMethods
                }

                let dto = SessionDTO(id: id, sessionData: sessionData, paymentMethods: paymentMethods)
                _ = checkoutID
                resolver(dto.jsonObject)
            } catch {
                rejecter("session", nil, error)
            }
        }
    }

    /// Sets up an ``AdvancedCheckout`` and wires its lifecycle closures to React Native events.
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
            do {
                _ = try await CheckoutCoordinator.shared.setup(ownerID: self.lifecycleOwnerID) {
                    let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                    let checkout = try await Checkout.setup(
                        with: paymentMethods,
                        configuration: checkoutConfiguration,
                        presentationDelegate: self
                    )
                    self.setupAdvancedCallbacks(on: checkout)
                    return NativeCheckoutFlow(checkoutContext: checkout) { [weak self] in
                        self?.cancelPendingOperations()
                        self?.cleanUp()
                    }
                }
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
            guard let state = CheckoutCoordinator.shared.checkoutState else {
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
            guard let state = CheckoutCoordinator.shared.checkoutState else {
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
            guard let state = CheckoutCoordinator.shared.checkoutState else {
                print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
                return
            }
            let checkout = state.checkoutContext
            do {
                var presenter: HeadlessCheckoutPresenter?
                _ = try CheckoutCoordinator.shared.beginOperation {
                    let component = try self.resolveComponent(for: typeString, checkout: checkout)
                    let newPresenter = HeadlessCheckoutPresenter(component: component)
                    presenter = newPresenter
                    return newPresenter
                }
                presenter?.submit()
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

    /// Clears cached components, suspended closures, and the shared checkout context/presenter stack.
    @MainActor
    private func performCleanup() {
        Task { @MainActor in
            await CheckoutCoordinator.shared.invalidate()
        }
    }

    @MainActor
    private func cancelPendingOperations() {
        resultSink.cancelPending()
        beforeSubmitBridge.resolve(.abort)
        cancelApplePayCallbacks()
    }

    /// Returns (building and caching if needed) the payment component for [type] within [checkout].
    @MainActor
    private func resolveComponent(for type: String, checkout: PaymentCheckout) throws -> CheckoutPaymentComponent {
        guard let paymentMethodType = PaymentMethodType(rawValue: type) else {
            throw ModuleException.invalidPaymentMethods
        }
        return try checkout.createPaymentComponent(for: paymentMethodType)
    }

    // MARK: - Configuration

    private func buildCheckoutConfiguration(parser: RootConfigurationParser,
                                            configuration: NSDictionary) throws -> CheckoutConfiguration {
        // BIN callbacks are checkout-wide so they serve Drop-in, embedded views, and headless submit alike.
        let cardConfiguration = CardConfigurationParser(
            configuration: configuration,
            onBinChange: { [weak self] binValue in
                self?.sendEvent(event: .changeBinValue, body: binValue)
            },
            onBinLookup: { [weak self] data in
                self?.sendBinLookupEvent(data)
            }
        ).configuration
        let authenticationConfiguration = ThreeDS2ConfigurationParser(configuration: configuration).configuration

        // The DSL can't mix an optional entry with required ones, so branch on Apple Pay's presence.
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

    /// Emits the brands detected for a BIN, flattened to `[{ brand }]` to match Android.
    @MainActor
    private func sendBinLookupEvent(_ data: BinLookupData) {
        let brands = data.brands.map { [Key.brand: $0.brand] }
        guard !brands.isEmpty else { return }
        sendEvent(event: .binLookup, body: brands)
    }

    // MARK: - Session callbacks

    /// Wires the v6 ``SessionCheckout`` closures to the React Native session events.
    @MainActor
    private func setupSessionCallbacks(on checkout: SessionCheckout, sessionData: String) {
        _ = checkout
            .onBeforeSubmit { [weak self] data in
                guard let self, CheckoutCoordinator.shared.owns(checkout: checkout) else {
                    return .abort
                }
                return await self.awaitBeforeSubmitResult(for: data)
            }
            .onComplete { [weak self] result in
                guard let self, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.sendCompleteEvent(result: result, sessionData: sessionData)
            }
            .onFailure { [weak self] error in
                guard let self, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.sendError(error: error)
            }
    }

    @MainActor
    private func awaitBeforeSubmitResult(for data: BeforeSubmitData) async -> BeforeSubmitResult {
        pendingBeforeSubmitData = data
        return await beforeSubmitBridge.suspend(superseding: .abort) {
            sendEvent(event: .beforeSubmit, body: beforeSubmitDataDictionary(data))
        }
    }

    private func beforeSubmitDataDictionary(_ data: BeforeSubmitData) -> [String: Any] {
        var dictionary: [String: Any] = [:]
        if let billingAddress = data.billingAddress {
            dictionary[Key.billingAddress] = billingAddress.jsonObject
        }
        if let deliveryAddress = data.deliveryAddress {
            dictionary[Key.deliveryAddress] = deliveryAddress.jsonObject
        }
        if let shopperName = data.shopperName {
            dictionary[Key.shopperName] = shopperName.jsonObject
        }
        if let shopperEmail = data.shopperEmail {
            dictionary[Key.shopperEmail] = shopperEmail
        }
        return dictionary
    }

    private func parseBeforeSubmitResult(_ result: NSDictionary) throws -> BeforeSubmitResult {
        guard let type = result[Key.type] as? String else {
            throw ModuleException.invalidPaymentMethods
        }
        if type == Key.abort {
            return .abort
        }
        guard type == Key.proceed,
              let data = result[Key.data] as? NSDictionary,
              var beforeSubmitData = pendingBeforeSubmitData else {
            throw ModuleException.invalidPaymentMethods
        }
        pendingBeforeSubmitData = nil
        beforeSubmitData.billingAddress = (data[Key.billingAddress] as? NSDictionary).flatMap { try? $0.decode() as PostalAddress }
        beforeSubmitData.deliveryAddress = (data[Key.deliveryAddress] as? NSDictionary).flatMap { try? $0.decode() as PostalAddress }
        beforeSubmitData.shopperName = (data[Key.shopperName] as? NSDictionary).flatMap { try? $0.decode() as ShopperName }
        beforeSubmitData.shopperEmail = data[Key.shopperEmail] as? String
        return .proceed(
            data: beforeSubmitData,
            sessionData: result[Key.sessionData] as? String
        )
    }

    private func sendCompleteEvent(result: SessionCheckoutResult, sessionData: String) {
        var dict = result.jsonObject
        dict[Key.sessionId] = result.sessionId
        dict[Key.sessionData] = sessionData
        sendEvent(withName: EventName.completeSession.rawValue, body: dict)
        ensureMainThread {
            Task { @MainActor in
                await CheckoutCoordinator.shared.invalidate()
            }
        }
    }

    override func sendError(error: any Error) {
        let errorToSend = checkErrorType(error)
        ensureMainThread {
            // Session errors surface on `failSession`; advanced-flow errors on `fail`.
            let eventName: EventName = CheckoutCoordinator.shared.checkoutState?.isSession == true ? .failSession : .fail
            self.sendEvent(withName: eventName.rawValue, body: errorToSend.jsonObject)
            Task { @MainActor in await CheckoutCoordinator.shared.invalidate() }
        }
    }

    private enum Key {
        static let id = "id"
        static let sessionData = "sessionData"
        static let sessionId = "sessionId"
        static let type = "type"
        static let data = "data"
        static let proceed = "proceed"
        static let abort = "abort"
        static let billingAddress = "billingAddress"
        static let deliveryAddress = "deliveryAddress"
        static let shopperName = "shopperName"
        static let shopperEmail = "shopperEmail"
        static let brand = "brand"
    }
}

/// Owns the SDK component allocated for one headless operation. It is retained only by the active
/// coordinator operation and releases the component once that operation reaches terminal cleanup.
@MainActor
private final class HeadlessCheckoutPresenter: CoordinatorPresenter {

    private var component: CheckoutPaymentComponent?

    init(component: CheckoutPaymentComponent) {
        self.component = component
    }

    func submit() {
        component?.submit()
    }

    func dispose() {
        component = nil
    }
}
