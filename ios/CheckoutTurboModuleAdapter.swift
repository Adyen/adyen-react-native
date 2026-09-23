//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCard
import AdyenCheckout
import AdyenComponents
import Foundation
import PassKit
import React
import UIKit

/// Swift-owned implementation for the generated Checkout TurboModule. Objective-C++ only adapts
/// Codegen's C++ records and generated event emitter to this coordinator-facing adapter.
@objc(CheckoutTurboModuleAdapter)
@MainActor
internal final class CheckoutTurboModuleAdapter: NSObject {

    typealias NativeEventSink = @convention(block) (NSDictionary) -> Void

    private var eventSink: NativeEventSink?
    private var pendingResponses: [String: PendingResponse] = [:]
    private var pendingBeforeSubmitData: BeforeSubmitData?
    private let submitBridge = CallbackBridge<SubmitResult>()
    private let additionalDetailsBridge = CallbackBridge<AdditionalDetailsResult>()
    private let beforeSubmitBridge = CallbackBridge<BeforeSubmitResult>()
    private let authorizationBridge = CallbackBridge<PKPaymentAuthorizationResult>()
    private let shippingContactBridge = CallbackBridge<PKPaymentRequestShippingContactUpdate>()
    private let shippingMethodBridge = CallbackBridge<PKPaymentRequestShippingMethodUpdate>()
    private let couponCodeBridge = CallbackBridge<PKPaymentRequestCouponCodeUpdate>()
    private var currentSummaryItems: [PKPaymentSummaryItem] = []
    private var currentShippingMethods: [PKShippingMethod] = []

    override init() {
        super.init()
        CheckoutCoordinator.shared.configureRuntimeDependencies(
            CheckoutCoordinatorDependencies(
                checkoutFactory: UnavailableCheckoutFactory(),
                presenterFactory: TurboPresenterFactory(),
                eventSink: TurboCoordinatorEventSink(),
                identityGenerator: UUIDCheckoutIdentityGenerator(),
                scheduler: DispatchCheckoutScheduler(),
                hostAdapter: TurboCheckoutHostAdapter()
            )
        )
    }

    deinit {
        Task { @MainActor in
            CheckoutCoordinator.shared.hostDidDisappear()
        }
    }

    @objc
    func setEventSink(_ sink: @escaping NativeEventSink) {
        eventSink = sink
    }

    @objc
    func setSdkVersion(_ sdkVersion: String) {
        BaseModule.sdkVersion = sdkVersion
    }

    @objc
    func setupSession(
        _ sessionModelJSON: NSDictionary,
        configuration: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let id = sessionModelJSON["id"] as? String,
              let sessionData = sessionModelJSON["sessionData"] as? String
        else {
            rejecter(ErrorCode.invalidConfiguration, "Invalid session configuration", nil)
            return
        }

        let parser = RootConfigurationParser(configuration: configuration)
        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let checkoutID = try await CheckoutCoordinator.shared.setup {
                    let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                    let checkout = try await Checkout.setup(
                        with: SessionResponse(id: id, sessionData: sessionData),
                        configuration: checkoutConfiguration,
                        presentationDelegate: self
                    )
                    guard checkout.paymentMethods != nil else {
                        throw ModuleException.invalidPaymentMethods
                    }
                    self.configureSessionCallbacks(on: checkout, sessionData: sessionData)
                    return NativeCheckoutFlow(checkoutContext: checkout) { [weak self] in
                        self?.cancelPendingRequests()
                    }
                }
                guard let paymentMethods = CheckoutCoordinator.shared.checkoutState?.checkoutContext.paymentMethods else {
                    throw ModuleException.invalidPaymentMethods
                }
                try resolver(self.descriptor(checkoutID: checkoutID, flow: "sessions", paymentMethods: paymentMethods))
            } catch {
                rejecter(ErrorCode.invalidConfiguration, "Checkout setup failed", error)
            }
        }
    }

    @objc
    func setupAdvanced(
        _ paymentMethodsDictionary: NSDictionary,
        configuration: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        let paymentMethods: PaymentMethods
        do {
            paymentMethods = try paymentMethodsDictionary.decode()
        } catch {
            rejecter(ErrorCode.invalidConfiguration, "Invalid payment methods", error)
            return
        }

        let parser = RootConfigurationParser(configuration: configuration)
        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let checkoutID = try await CheckoutCoordinator.shared.setup {
                    let checkoutConfiguration = try self.buildCheckoutConfiguration(parser: parser, configuration: configuration)
                    let checkout = try await Checkout.setup(
                        with: paymentMethods,
                        configuration: checkoutConfiguration,
                        presentationDelegate: self
                    )
                    self.configureAdvancedCallbacks(on: checkout)
                    return NativeCheckoutFlow(checkoutContext: checkout) { [weak self] in
                        self?.cancelPendingRequests()
                    }
                }
                try resolver(self.descriptor(checkoutID: checkoutID, flow: "advanced", paymentMethods: paymentMethods))
            } catch {
                rejecter(ErrorCode.invalidConfiguration, "Checkout setup failed", error)
            }
        }
    }

    @objc
    func isAvailable(
        _ checkoutID: String,
        target: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard owns(checkoutID, rejecter: rejecter) else { return }
        do {
            try resolver(component(for: target, checkout: CheckoutCoordinator.shared.checkoutState!.checkoutContext) != nil)
        } catch {
            rejecter(ErrorCode.invalidTarget, "Invalid checkout target", error)
        }
    }

    @objc
    func requiresUserInteraction(
        _ checkoutID: String,
        target: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard owns(checkoutID, rejecter: rejecter) else { return }
        do {
            guard let component = try component(for: target, checkout: CheckoutCoordinator.shared.checkoutState!.checkoutContext) else {
                resolver(false)
                return
            }
            resolver(component.requiresUserInteraction)
        } catch {
            rejecter(ErrorCode.invalidTarget, "Invalid checkout target", error)
        }
    }

    @objc
    func submit(
        _ checkoutID: String,
        target: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard owns(checkoutID, rejecter: rejecter) else { return }
        guard let checkout = CheckoutCoordinator.shared.checkoutState?.checkoutContext else {
            rejecter(ErrorCode.staleCheckout, "Checkout is no longer active", nil)
            return
        }
        do {
            var presenter: TurboHeadlessPresenter?
            _ = try CheckoutCoordinator.shared.beginOperation {
                guard let component = try self.component(for: target, checkout: checkout) else {
                    throw ModuleException.invalidPaymentMethods
                }
                let newPresenter = TurboHeadlessPresenter(component: component)
                presenter = newPresenter
                return newPresenter
            }
            presenter?.submit()
            resolver(nil)
        } catch let error as CoordinatorError {
            rejecter(error == .operationBusy ? ErrorCode.operationBusy : ErrorCode.staleCheckout, "Checkout is unavailable", nil)
        } catch {
            rejecter(ErrorCode.invalidTarget, "Invalid checkout target", error)
        }
    }

    @objc
    func startDropIn(
        _ checkoutID: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard owns(checkoutID, rejecter: rejecter) else { return }
        rejecter(ErrorCode.unsupportedCapability, "Drop-in is not available on this iOS SDK", nil)
    }

    @objc
    func respond(
        _ response: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        let payload: [String: Any]?
        if let payloadJSON = response["payloadJson"] as? String {
            guard let data = payloadJSON.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data),
                  let dictionary = object as? [String: Any]
            else {
                rejecter(ErrorCode.staleRequest, "Invalid request response", nil)
                return
            }
            payload = dictionary
        } else {
            payload = nil
        }

        guard let checkoutID = response["checkoutId"] as? String,
              let operationID = response["operationId"] as? String,
              let requestID = response["requestId"] as? String,
              let kind = response["kind"] as? String,
              let pending = pendingResponses[requestID],
              pending.request.checkoutID == checkoutID,
              pending.request.operationID == operationID,
              pending.kind == kind,
              CheckoutCoordinator.shared.resolve(pending.request)
        else {
            rejecter(ErrorCode.staleRequest, "Request is no longer active", nil)
            return
        }

        pendingResponses.removeValue(forKey: requestID)
        pending.resume(payload)
        resolver(nil)
    }

    @objc
    func invalidate(
        _ checkoutID: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        do {
            try CheckoutCoordinator.shared.invalidate(checkoutID: checkoutID)
            resolver(nil)
        } catch {
            rejecter(ErrorCode.staleCheckout, "Checkout is no longer active", nil)
        }
    }

    @objc
    func hostDidDisappear() {
        CheckoutCoordinator.shared.hostDidDisappear()
    }
}

// MARK: - Checkout callbacks and correlated request routing

@MainActor
private extension CheckoutTurboModuleAdapter {
    func configureSessionCallbacks(on checkout: SessionCheckout, sessionData: String) {
        _ = checkout
            .onBeforeSubmit { [weak self, weak checkout] data in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout),
                      let operationID = CheckoutCoordinator.shared.operationID
                else {
                    return .abort
                }
                self.pendingBeforeSubmitData = data
                return await self.beforeSubmitBridge.suspend(superseding: .abort) {
                    self.createRequest(
                        operationID: operationID,
                        kind: .sessionBeforeSubmit,
                        eventKind: EventKind.sessionBeforeSubmit,
                        payload: self.beforeSubmitPayload(data)
                    ) { [weak self] payload in
                        self?.beforeSubmitBridge.resolve(self?.beforeSubmitResult(payload) ?? .abort)
                    }
                }
            }
            .onComplete { [weak self, weak checkout] result in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.emitTerminal(
                    kind: EventKind.completion,
                    payload: [
                        "resultCode": result.resultCode.rawValue,
                        "sessionId": result.sessionId,
                        "sessionData": sessionData
                    ]
                )
            }
            .onFailure { [weak self, weak checkout] _ in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.emitTerminal(kind: EventKind.error, payload: [:])
            }
    }

    func configureAdvancedCallbacks(on checkout: AdvancedCheckout) {
        _ = checkout
            .onSubmit { [weak self, weak checkout] data in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout),
                      let operationID = CheckoutCoordinator.shared.operationID
                else {
                    return errorSubmitResult
                }
                return await self.submitBridge.suspend(superseding: errorSubmitResult) {
                    self.createRequest(
                        operationID: operationID,
                        kind: .advancedSubmit,
                        eventKind: EventKind.advancedSubmit,
                        payload: data.jsonObject
                    ) { [weak self] payload in
                        self?.submitBridge.resolve(self?.submitResult(payload) ?? errorSubmitResult)
                    }
                }
            }
            .onAdditionalDetails { [weak self, weak checkout] data in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout),
                      let operationID = CheckoutCoordinator.shared.operationID
                else {
                    return errorAdditionalDetailsResult
                }
                return await self.additionalDetailsBridge.suspend(superseding: errorAdditionalDetailsResult) {
                    self.createRequest(
                        operationID: operationID,
                        kind: .advancedAdditionalDetails,
                        eventKind: EventKind.advancedAdditionalDetails,
                        payload: data.jsonObject
                    ) { [weak self] payload in
                        let resultCode = payload?["resultCode"] as? String ?? errorResultCode
                        self?.additionalDetailsBridge.resolve(.completion(resultCode: resultCode))
                    }
                }
            }
            .onComplete { [weak self, weak checkout] result in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.emitTerminal(kind: EventKind.completion, payload: ["resultCode": result.resultCode.rawValue])
            }
            .onFailure { [weak self, weak checkout] _ in
                guard let self, let checkout, CheckoutCoordinator.shared.owns(checkout: checkout) else { return }
                self.emitTerminal(kind: EventKind.error, payload: [:])
            }
    }

    func createRequest(
        operationID: String,
        kind: CoordinatorRequestKind,
        eventKind: String,
        payload: [String: Any],
        resume: @escaping ([String: Any]?) -> Void
    ) {
        do {
            var requestID: String?
            let request = try CheckoutCoordinator.shared.beginRequest(
                operationID: operationID,
                kind: kind,
                timeout: 60
            ) { [weak self] in
                if let requestID {
                    self?.pendingResponses.removeValue(forKey: requestID)
                }
                resume(nil)
            }
            requestID = request.requestID
            pendingResponses[request.requestID] = PendingResponse(request: request, kind: eventKind, resume: resume)
            emit(request: request, kind: eventKind, payload: payload)
        } catch {
            resume(nil)
        }
    }

    func emitTerminal(kind: String, payload: [String: Any]) {
        guard let checkoutID = CheckoutCoordinator.shared.checkoutID else { return }
        let operationID = CheckoutCoordinator.shared.operationID
        emit(checkoutID: checkoutID, operationID: operationID, requestID: nil, kind: kind, payload: payload)
        CheckoutCoordinator.shared.invalidate()
    }

    func cancelPendingRequests() {
        let pending = pendingResponses.values
        pendingResponses.removeAll()
        pending.forEach { $0.resume(nil) }
        submitBridge.resolve(errorSubmitResult)
        additionalDetailsBridge.resolve(errorAdditionalDetailsResult)
        beforeSubmitBridge.resolve(.abort)
        authorizationBridge.resolve(.init(status: .failure, errors: nil))
        shippingContactBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        shippingMethodBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        couponCodeBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
    }
}

// MARK: - Target parsing, descriptors, and generated events

@MainActor
private extension CheckoutTurboModuleAdapter {
    func owns(_ checkoutID: String, rejecter: RCTPromiseRejectBlock) -> Bool {
        guard CheckoutCoordinator.shared.isActive(checkoutID: checkoutID) else {
            rejecter(ErrorCode.staleCheckout, "Checkout is no longer active", nil)
            return false
        }
        return true
    }

    func descriptor(checkoutID: String, flow: String, paymentMethods: PaymentMethods) throws -> NSDictionary {
        try [
            "checkoutId": checkoutID,
            "flow": flow,
            "paymentMethodsJson": jsonString(paymentMethods.jsonObject)
        ]
    }

    func resolvePaymentTarget(_ target: NSDictionary) throws -> TurboCheckoutTarget {
        guard let kind = target["kind"] as? String else {
            throw ModuleException.invalidPaymentMethods
        }
        switch kind {
        case "paymentMethod":
            guard let type = target["type"] as? String, !type.isEmpty,
                  let paymentMethodType = PaymentMethodType(rawValue: type)
            else {
                throw ModuleException.invalidPaymentMethods
            }
            return .paymentMethod(paymentMethodType)
        case "storedPaymentMethod":
            guard let id = target["id"] as? String, !id.isEmpty else {
                throw ModuleException.invalidPaymentMethods
            }
            return .storedPaymentMethod(id)
        default:
            throw ModuleException.invalidPaymentMethods
        }
    }

    func component(for target: NSDictionary, checkout: PaymentCheckout) throws -> CheckoutPaymentComponent? {
        switch try resolvePaymentTarget(target) {
        case let .paymentMethod(type):
            guard checkout.paymentMethods?.paymentMethod(ofType: type) != nil else { return nil }
            return try checkout.createPaymentComponent(for: type)
        case let .storedPaymentMethod(identifier):
            return try checkout.createPaymentComponent(for: identifier)
        }
    }

    func emit(request: CoordinatorRequest, kind: String, payload: [String: Any]) {
        emit(
            checkoutID: request.checkoutID,
            operationID: request.operationID,
            requestID: request.requestID,
            kind: kind,
            payload: payload
        )
    }

    func emit(
        checkoutID: String,
        operationID: String?,
        requestID: String?,
        kind: String,
        payload: [String: Any]
    ) {
        var event: [String: Any] = [
            "checkoutId": checkoutID,
            "kind": kind
        ]
        if let operationID {
            event["operationId"] = operationID
        }
        if let requestID {
            event["requestId"] = requestID
        }
        event["payloadJson"] = (try? jsonString(payload)) ?? "{}"
        eventSink?(event as NSDictionary)
    }

    func beforeSubmitPayload(_ data: BeforeSubmitData) -> [String: Any] {
        var payload: [String: Any] = [:]
        if let billingAddress = data.billingAddress {
            payload["billingAddress"] = billingAddress.jsonObject
        }
        if let deliveryAddress = data.deliveryAddress {
            payload["deliveryAddress"] = deliveryAddress.jsonObject
        }
        if let shopperName = data.shopperName {
            payload["shopperName"] = shopperName.jsonObject
        }
        if let shopperEmail = data.shopperEmail {
            payload["shopperEmail"] = shopperEmail
        }
        return payload
    }

    func beforeSubmitResult(_ payload: [String: Any]?) -> BeforeSubmitResult {
        guard let payload, payload["type"] as? String == "proceed",
              let data = payload["data"] as? NSDictionary,
              var beforeSubmitData = pendingBeforeSubmitData
        else {
            return .abort
        }
        pendingBeforeSubmitData = nil
        beforeSubmitData.billingAddress = (data["billingAddress"] as? NSDictionary).flatMap { try? $0.decode() as PostalAddress }
        beforeSubmitData.deliveryAddress = (data["deliveryAddress"] as? NSDictionary).flatMap { try? $0.decode() as PostalAddress }
        beforeSubmitData.shopperName = (data["shopperName"] as? NSDictionary).flatMap { try? $0.decode() as ShopperName }
        beforeSubmitData.shopperEmail = data["shopperEmail"] as? String
        return .proceed(data: beforeSubmitData, sessionData: payload["sessionData"] as? String)
    }

    func submitResult(_ payload: [String: Any]?) -> SubmitResult {
        guard let payload else { return errorSubmitResult }
        switch payload["type"] as? String {
        case "action":
            guard let actionDictionary = payload["action"] else { return errorSubmitResult }
            guard let actionData = try? JSONSerialization.data(withJSONObject: actionDictionary),
                  let action = try? JSONDecoder().decode(Action.self, from: actionData)
            else {
                return errorSubmitResult
            }
            return .action(action)
        case "completed":
            return .completion(resultCode: payload["resultCode"] as? String ?? errorResultCode)
        case "retry":
            return .retry(errorMessage: payload["message"] as? String)
        default:
            return errorSubmitResult
        }
    }
}

// MARK: - Apple Pay

@MainActor
private extension CheckoutTurboModuleAdapter {
    func buildCheckoutConfiguration(parser: RootConfigurationParser, configuration: NSDictionary) throws -> CheckoutConfiguration {
        let cardConfiguration = CardConfigurationParser(configuration: configuration).configuration
        let authenticationConfiguration = ThreeDS2ConfigurationParser(configuration: configuration).configuration
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

    func makeApplePayConfiguration(parser: RootConfigurationParser, configuration: NSDictionary) throws -> ApplePayConfiguration? {
        let applePayParser = ApplepayConfigurationParser(configuration: configuration)
        guard applePayParser.merchantID != nil, let amount = parser.amount, let countryCode = parser.countryCode else {
            return nil
        }
        var result = try applePayParser.buildConfiguration(amount: amount, countryCode: countryCode)
            .onAuthorize { [weak self] payment in
                await self?.awaitAuthorization(payment) ?? .init(status: .failure, errors: nil)
            }
            .onSelectShippingContact { [weak self] contact, summaryItems in
                await self?.awaitShippingContact(contact, summaryItems: summaryItems) ?? .init(paymentSummaryItems: summaryItems)
            }
            .onSelectShippingMethod { [weak self] method, summaryItems in
                await self?.awaitShippingMethod(method, summaryItems: summaryItems) ?? .init(paymentSummaryItems: summaryItems)
            }
        if #available(iOS 15.0, *) {
            result = result.onChangeCouponCode { [weak self] couponCode, summaryItems in
                await self?.awaitCouponCode(couponCode, summaryItems: summaryItems) ?? .init(paymentSummaryItems: summaryItems)
            }
        }
        return result
    }

    func awaitAuthorization(_ payment: PKPayment) async -> PKPaymentAuthorizationResult {
        guard let operationID = CheckoutCoordinator.shared.operationID else { return .init(status: .failure, errors: nil) }
        return await authorizationBridge.suspend(superseding: .init(status: .failure, errors: nil)) {
            self.createRequest(
                operationID: operationID,
                kind: .applePayAuthorization,
                eventKind: EventKind.applePayAuthorization,
                payload: [:]
            ) { [weak self] payload in
                let success = payload?["status"] as? String == "success"
                self?.authorizationBridge.resolve(.init(status: success ? .success : .failure, errors: nil))
            }
        }
    }

    func awaitShippingContact(_ contact: PKContact, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestShippingContactUpdate {
        currentSummaryItems = summaryItems
        return await applePayUpdate(
            bridge: shippingContactBridge,
            kind: .applePayShippingContact,
            eventKind: EventKind.applePayShippingContact,
            payload: contact.jsonObject
        ) { [weak self] payload in
            self?.shippingContactBridge.resolve(self?.shippingUpdate(payload) ?? .init(paymentSummaryItems: summaryItems))
        }
    }

    func awaitShippingMethod(_ method: PKShippingMethod, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestShippingMethodUpdate {
        currentSummaryItems = summaryItems
        return await shippingMethodBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) {
            guard let operationID = CheckoutCoordinator.shared.operationID else { return }
            self.createRequest(
                operationID: operationID,
                kind: .applePayShippingMethod,
                eventKind: EventKind.applePayShippingMethod,
                payload: method.jsonObject
            ) { [weak self] _ in
                self?.shippingMethodBridge.resolve(.init(paymentSummaryItems: summaryItems))
            }
        }
    }

    func awaitCouponCode(_ couponCode: String, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestCouponCodeUpdate {
        currentSummaryItems = summaryItems
        return await couponCodeBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) {
            guard let operationID = CheckoutCoordinator.shared.operationID else { return }
            self.createRequest(
                operationID: operationID,
                kind: .applePayCouponCode,
                eventKind: EventKind.applePayCouponCode,
                payload: ["couponCode": couponCode]
            ) { [weak self] payload in
                _ = payload
                self?.couponCodeBridge.resolve(
                    .init(errors: nil, paymentSummaryItems: summaryItems, shippingMethods: self?.currentShippingMethods ?? [])
                )
            }
        }
    }

    func applePayUpdate(
        bridge: CallbackBridge<PKPaymentRequestShippingContactUpdate>,
        kind: CoordinatorRequestKind,
        eventKind: String,
        payload: [String: Any],
        resume: @escaping ([String: Any]?) -> Void
    ) async -> PKPaymentRequestShippingContactUpdate {
        await bridge.suspend(superseding: .init(paymentSummaryItems: currentSummaryItems)) {
            guard let operationID = CheckoutCoordinator.shared.operationID else { return }
            createRequest(operationID: operationID, kind: kind, eventKind: eventKind, payload: payload, resume: resume)
        }
    }

    func shippingUpdate(_ payload: [String: Any]?) -> PKPaymentRequestShippingContactUpdate {
        _ = payload
        return .init(errors: nil, paymentSummaryItems: currentSummaryItems, shippingMethods: currentShippingMethods)
    }
}

extension CheckoutTurboModuleAdapter: PresentationDelegate {
    func present(component: PresentableComponent) {
        guard let presenter = CheckoutCoordinator.shared.topPresenterProvider() else {
            emitTerminal(kind: EventKind.error, payload: [:])
            return
        }
        let viewController = UINavigationController(rootViewController: component.viewController)
        presenter.present(viewController, animated: true)
        CheckoutCoordinator.shared.presenterStack.append(viewController)
    }
}

@MainActor
private final class TurboHeadlessPresenter: CoordinatorPresenter {
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

@MainActor
private struct PendingResponse {
    let request: CoordinatorRequest
    let kind: String
    let resume: ([String: Any]?) -> Void
}

private enum TurboCheckoutTarget {
    case paymentMethod(PaymentMethodType)
    case storedPaymentMethod(String)
}

private enum EventKind {
    static let advancedSubmit = "advancedSubmit"
    static let advancedAdditionalDetails = "advancedAdditionalDetails"
    static let sessionBeforeSubmit = "sessionBeforeSubmit"
    static let applePayAuthorization = "applePayAuthorization"
    static let applePayShippingContact = "applePayShippingContact"
    static let applePayShippingMethod = "applePayShippingMethod"
    static let applePayCouponCode = "applePayCouponCode"
    static let completion = "completion"
    static let error = "error"
}

private enum ErrorCode {
    static let invalidConfiguration = "invalidConfiguration"
    static let invalidTarget = "invalidTarget"
    static let staleCheckout = "staleCheckout"
    static let staleRequest = "staleRequest"
    static let operationBusy = "operationBusy"
    static let unsupportedCapability = "unsupportedCapability"
}

private func jsonString(_ object: Any) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: object)
    return String(decoding: data, as: UTF8.self)
}

@MainActor
private final class UnavailableCheckoutFactory: CheckoutFactory {
    func makeCheckout() async throws -> CoordinatorCheckout {
        throw CoordinatorError.noActiveCheckout
    }
}

@MainActor
private final class TurboPresenterFactory: PresenterFactory {
    func makePresenter() -> CoordinatorPresenter {
        NoopTurboPresenter()
    }
}

@MainActor
private final class NoopTurboPresenter: CoordinatorPresenter {
    func dispose() {}
}

@MainActor
private final class TurboCoordinatorEventSink: CheckoutEventSink {
    func emit(_: CoordinatorEvent) {}
}

@MainActor
private final class UUIDCheckoutIdentityGenerator: CheckoutIdentityGenerator {
    func nextID(for _: CoordinatorIdentityKind) -> String {
        UUID().uuidString
    }
}

@MainActor
private final class DispatchCheckoutScheduler: CheckoutScheduler {
    func schedule(after interval: TimeInterval, action: @escaping @MainActor () -> Void) -> CoordinatorCancellation {
        let item = DispatchWorkItem {
            Task { @MainActor in action() }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + interval, execute: item)
        return DispatchCoordinatorCancellation(item: item)
    }
}

@MainActor
private final class DispatchCoordinatorCancellation: CoordinatorCancellation {
    private let item: DispatchWorkItem

    init(item: DispatchWorkItem) {
        self.item = item
    }

    func cancel() {
        item.cancel()
    }
}

@MainActor
private final class TurboCheckoutHostAdapter: CheckoutHostAdapter {
    func releaseCheckoutHost() {
        CheckoutCoordinator.shared.presenterStack.removeAll()
    }
}
