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

struct ApplePayShippingMethodsState {
    private(set) var methods: [PKShippingMethod]

    init(initial: [PKShippingMethod] = []) {
        methods = initial
    }

    @discardableResult
    mutating func applyUpdate(_ payload: [String: Any]?) -> [PKShippingMethod] {
        guard let rawMethods = payload?["shippingMethods"] as? [[String: Any]] else {
            return methods
        }
        methods = rawMethods.compactMap(PKShippingMethod.initiate)
        return methods
    }
}

/// Swift-owned implementation for the generated Checkout TurboModule. Objective-C++ only adapts
/// Codegen's C++ records and generated event emitter to this coordinator-facing adapter.
@objc(CheckoutTurboModuleAdapter)
@MainActor
internal final class CheckoutTurboModuleAdapter: NSObject {

    typealias NativeEventSink = @convention(block) (NSDictionary) -> Void

    /// This private token binds React runtime teardown to the checkout this module instance owns.
    /// A stale module can outlive a replacement during reload and must not clear that replacement.
    private let lifecycleOwnerID = UUID().uuidString
    private let coordinator: CheckoutCoordinator
    private let assertDropInAvailability: (String) throws -> Void
    private var eventSink: NativeEventSink?
    private var pendingResponses: [String: PendingResponse] = [:]
    private var pendingBeforeSubmitData: BeforeSubmitData?
    private let submitBridge = CallbackBridge<SubmitResult>()
    private let additionalDetailsBridge = CallbackBridge<AdditionalDetailsResult>()
    private let beforeSubmitBridge = CallbackBridge<[String: Any]?>()
    private let authorizationBridge = CallbackBridge<PKPaymentAuthorizationResult>()
    private let shippingContactBridge = CallbackBridge<PKPaymentRequestShippingContactUpdate>()
    private let shippingMethodBridge = CallbackBridge<PKPaymentRequestShippingMethodUpdate>()
    private let couponCodeBridge = CallbackBridge<PKPaymentRequestCouponCodeUpdate>()
    private let addressLookupBridge = CallbackBridge<[AddressLookupResult]>()
    private let addressSelectionBridge = CallbackBridge<AddressSelectionResponse>()
    private var currentSummaryItems: [PKPaymentSummaryItem] = []
    private var applePayShippingMethods = ApplePayShippingMethodsState()

    override init() {
        coordinator = .shared
        assertDropInAvailability = coordinator.assertDropInAvailability
        super.init()
        coordinator.configureRuntimeDependencies(
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

    internal init(
        coordinator: CheckoutCoordinator = .shared,
        assertDropInAvailability: @escaping (String) throws -> Void
    ) {
        self.coordinator = coordinator
        self.assertDropInAvailability = assertDropInAvailability
        super.init()
    }

    deinit {
        let coordinator = coordinator
        let lifecycleOwnerID = lifecycleOwnerID
        Task { @MainActor in
            await coordinator.hostDidDisappear(ownerID: lifecycleOwnerID)
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

    internal var pendingResponseCount: Int {
        pendingResponses.count
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
                let checkoutID = try await coordinator.setup(ownerID: self.lifecycleOwnerID) {
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
                guard let paymentMethods = coordinator.checkoutState?.checkoutContext.paymentMethods else {
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
                let checkoutID = try await coordinator.setup(ownerID: self.lifecycleOwnerID) {
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
            try resolver(component(for: target, checkout: coordinator.checkoutState!.checkoutContext) != nil)
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
            guard let component = try component(for: target, checkout: coordinator.checkoutState!.checkoutContext) else {
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
        Task { @MainActor in
            guard owns(checkoutID, rejecter: rejecter) else { return }
            guard let checkout = coordinator.checkoutState?.checkoutContext else {
                rejecter(ErrorCode.staleCheckout, "Checkout is no longer active", nil)
                return
            }
            do {
                var presenter: TurboHeadlessPresenter?
                _ = try routeHeadlessSubmit {
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
    }

    /// The generated headless command reaches this router only after target parsing. Keeping the
    /// slot acquisition here makes a busy embedded owner reject before creating a component.
    func routeHeadlessSubmit(
        makePresenter: @escaping @MainActor () throws -> CoordinatorPresenter
    ) throws -> String {
        try coordinator.beginOperation(makePresenter: makePresenter)
    }

    @objc
    func startDropIn(
        _ checkoutID: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor in
            do {
                try assertDropInAvailability(checkoutID)
                rejecter(ErrorCode.unsupportedCapability, "Drop-in is not available on this iOS SDK", nil)
            } catch let error as CoordinatorError {
                let code = error == .operationBusy ? ErrorCode.operationBusy : ErrorCode.staleCheckout
                rejecter(code, "Checkout is unavailable", nil)
            } catch {
                rejecter(ErrorCode.staleCheckout, "Checkout is unavailable", nil)
            }
        }
    }

    @objc
    func respond(
        _ response: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let checkoutID = response["checkoutId"] as? String,
              let operationID = response["operationId"] as? String,
              let requestID = response["requestId"] as? String,
              let kind = response["kind"] as? String,
              let pending = pendingResponses[requestID],
              pending.request.checkoutID == checkoutID,
              pending.request.operationID == operationID,
              pending.kind == kind
        else {
            rejecter(ErrorCode.staleRequest, "Request is no longer active", nil)
            return
        }

        let payload: [String: Any]?
        if let payloadJSON = response["payloadJson"] as? String {
            guard let data = payloadJSON.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data),
                  let dictionary = object as? [String: Any]
            else {
                guard coordinator.resolve(pending.request) else {
                    rejecter(ErrorCode.staleRequest, "Request is no longer active", nil)
                    return
                }
                pendingResponses.removeValue(forKey: requestID)
                pending.resume(nil)
                rejecter(ErrorCode.staleRequest, "Invalid request response", nil)
                return
            }
            payload = dictionary
        } else {
            payload = nil
        }

        guard coordinator.resolve(pending.request) else {
            rejecter(ErrorCode.staleRequest, "Request is no longer active", nil)
            return
        }
        pendingResponses.removeValue(forKey: requestID)
        if pending.request.kind == .addressLookupSelection {
            coordinator.completeAddressLookupOperation(pending.request.operationID)
        }
        if pending.request.kind == .advancedSubmit, payload?["type"] as? String == "retry" {
            coordinator.releaseEmbeddedOperation(pending.request.operationID)
        }
        pending.resume(payload)
        resolver(nil)
    }

    @objc
    func invalidate(
        _ checkoutID: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        Task { @MainActor in
            do {
                try await coordinator.invalidate(checkoutID: checkoutID)
                resolver(nil)
            } catch {
                rejecter(ErrorCode.staleCheckout, "Checkout is no longer active", nil)
            }
        }
    }

    @objc
    func hostDidDisappear() {
        let lifecycleOwnerID = lifecycleOwnerID
        Task { @MainActor in
            await coordinator.hostDidDisappear(ownerID: lifecycleOwnerID)
        }
    }
}

// MARK: - Checkout callbacks and correlated request routing

@MainActor
extension CheckoutTurboModuleAdapter {
    func configureSessionCallbacks(on checkout: SessionCheckout, sessionData: String) {
        _ = checkout
            .onBeforeSubmit { [weak self, weak checkout] data in
                guard let self, let checkout, coordinator.owns(checkout: checkout) else {
                    return .abort
                }
                self.pendingBeforeSubmitData = data
                guard let response = await self.routeSessionBeforeSubmit(self.beforeSubmitPayload(data)) else {
                    return .abort
                }
                return self.beforeSubmitResult(response)
            }
            .onComplete { [weak self, weak checkout] result in
                guard let self, let checkout, coordinator.owns(checkout: checkout) else { return }
                self.routeTerminal(
                    kind: EventKind.completion,
                    payload: [
                        "resultCode": result.resultCode.rawValue,
                        "sessionId": result.sessionId,
                        "sessionData": sessionData
                    ]
                )
            }
            .onFailure { [weak self, weak checkout] _ in
                guard let self, let checkout, coordinator.owns(checkout: checkout) else { return }
                self.routeTerminal(kind: EventKind.error, payload: terminalErrorPayload)
            }
    }

    func configureAdvancedCallbacks(on checkout: AdvancedCheckout) {
        _ = checkout
            .onSubmit { [weak self, weak checkout] data in
                guard let self, let checkout, coordinator.owns(checkout: checkout),
                      let result = await self.routeAdvancedSubmit(data.jsonObject)
                else {
                    return errorSubmitResult
                }
                return result
            }
            .onAdditionalDetails { [weak self, weak checkout] data in
                guard let self, let checkout, coordinator.owns(checkout: checkout),
                      let result = await self.routeAdvancedAdditionalDetails(data.jsonObject)
                else {
                    return errorAdditionalDetailsResult
                }
                return result
            }
            .onComplete { [weak self, weak checkout] result in
                guard let self, let checkout, coordinator.owns(checkout: checkout) else { return }
                self.routeTerminal(kind: EventKind.completion, payload: ["resultCode": result.resultCode.rawValue])
            }
            .onFailure { [weak self, weak checkout] _ in
                guard let self, let checkout, coordinator.owns(checkout: checkout) else { return }
                self.routeTerminal(kind: EventKind.error, payload: terminalErrorPayload)
            }
    }

    /// Production SDK closures call these routers after verifying their checkout instance. They
    /// deliberately own anonymous embedded acquisition and the correlated bridge, so adapter
    /// tests exercise the same path rather than coordinator helpers alone.
    func routeSessionBeforeSubmit(_ payload: [String: Any]) async -> [String: Any]? {
        guard let operationID = acquireInitialEmbeddedOperationForCallback() else { return nil }
        return await beforeSubmitBridge.suspend(superseding: nil) { token in
            createRequest(
                operationID: operationID,
                kind: .sessionBeforeSubmit,
                eventKind: EventKind.sessionBeforeSubmit,
                payload: payload
            ) { [weak self] payload in
                self?.beforeSubmitBridge.resolve(token, payload)
            }
        }
    }

    func routeAdvancedSubmit(_ payload: [String: Any]) async -> SubmitResult? {
        guard let checkoutID = coordinator.checkoutID else { return nil }
        let operationID: String
        switch coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) {
        case let .acquired(value), let .explicit(value):
            operationID = value
        case .competing:
            return .retry(errorMessage: nil)
        }
        return await submitBridge.suspend(superseding: errorSubmitResult) { token in
            createRequest(
                operationID: operationID,
                kind: .advancedSubmit,
                eventKind: EventKind.advancedSubmit,
                payload: payload
            ) { [weak self] payload in
                self?.submitBridge.resolve(token, self?.submitResult(payload) ?? errorSubmitResult)
            }
        }
    }

    func routeAdvancedAdditionalDetails(_ payload: [String: Any]) async -> AdditionalDetailsResult? {
        guard let operationID = coordinator.operationID else { return nil }
        return await additionalDetailsBridge.suspend(superseding: errorAdditionalDetailsResult) { token in
            createRequest(
                operationID: operationID,
                kind: .advancedAdditionalDetails,
                eventKind: EventKind.advancedAdditionalDetails,
                payload: payload
            ) { [weak self] payload in
                let resultCode = payload?["resultCode"] as? String ?? errorResultCode
                self?.additionalDetailsBridge.resolve(token, .completion(resultCode: resultCode))
            }
        }
    }

    func routeTerminal(kind: String, payload: [String: Any]) {
        guard ensureOperationForTerminalCallback() != nil else { return }
        emitTerminal(kind: kind, payload: payload)
    }

    func createRequest(
        operationID: String,
        kind: CoordinatorRequestKind,
        eventKind: String,
        payload: [String: Any],
        resume: @escaping ([String: Any]?) -> Void
    ) {
        do {
            retireSupersededRequests(of: eventKind)
            var requestID: String?
            let request = try coordinator.beginRequest(
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
        guard let checkoutID = coordinator.checkoutID else { return }
        let operationID = coordinator.operationID
        emit(checkoutID: checkoutID, operationID: operationID, requestID: nil, kind: kind, payload: payload)
        Task { @MainActor in
            try? await coordinator.invalidate(checkoutID: checkoutID)
        }
    }

    /// The first embedded SDK callback acquires an anonymous checkout-level operation. It never
    /// selects a Fabric registration, target, or source view because the public SDK callback
    /// does not carry that identity.
    func acquireInitialEmbeddedOperationForCallback() -> String? {
        guard let checkoutID = coordinator.checkoutID else { return nil }
        switch coordinator.acquireInitialEmbeddedOperation(checkoutID: checkoutID) {
        case let .acquired(operationID), let .explicit(operationID):
            return operationID
        case .competing:
            return nil
        }
    }

    func ensureOperationForTerminalCallback() -> String? {
        if let operationID = coordinator.operationID {
            return operationID
        }
        return acquireInitialEmbeddedOperationForCallback()
    }

    /// CallbackBridge settles a superseded continuation immediately. Retire its matching broker
    /// entry at the same time so a stale response cannot invoke the newer continuation.
    func retireSupersededRequests(of eventKind: String) {
        let superseded = pendingResponses.values.filter { $0.kind == eventKind }
        for pending in superseded {
            pendingResponses.removeValue(forKey: pending.request.requestID)
            _ = coordinator.cancel(pending.request)
        }
    }

    func cancelPendingRequests() {
        let pending = pendingResponses.values
        pendingResponses.removeAll()
        pending.forEach { $0.resume(nil) }
        submitBridge.resolve(errorSubmitResult)
        additionalDetailsBridge.resolve(errorAdditionalDetailsResult)
        beforeSubmitBridge.resolve(nil)
        authorizationBridge.resolve(.init(status: .failure, errors: nil))
        shippingContactBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        shippingMethodBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        couponCodeBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        addressLookupBridge.resolve([])
        addressSelectionBridge.resolve(.failure(AddressLookupError.cancelled))
    }
}

// MARK: - Target parsing, descriptors, and generated events

@MainActor
extension CheckoutTurboModuleAdapter {
    func owns(_ checkoutID: String, rejecter: RCTPromiseRejectBlock) -> Bool {
        guard coordinator.isActive(checkoutID: checkoutID) else {
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
        try resolveCheckoutTarget(target)
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
extension CheckoutTurboModuleAdapter {
    func buildCheckoutConfiguration(parser: RootConfigurationParser, configuration: NSDictionary) throws -> CheckoutConfiguration {
        applePayShippingMethods = .init()
        let cardConfigurationParser = CardConfigurationParser(
            configuration: configuration,
            onAddressLookup: { [weak self] query in
                await self?.awaitAddressLookup(query) ?? []
            },
            onAddressSelected: { [weak self] candidate in
                guard let self else { throw AddressLookupError.cancelled }
                return try await self.awaitAddressSelection(candidate)
            }
        )
        try cardConfigurationParser.validateAddressLookupConfiguration()
        let cardConfiguration = cardConfigurationParser.configuration
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
        applePayShippingMethods = .init(initial: applePayParser.shippingMethods ?? [])
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
        var payload: [String: Any] = [:]
        if let billingContact = payment.billingContact {
            payload["billingContact"] = billingContact.jsonObject
        }
        if let shippingContact = payment.shippingContact {
            payload["shippingContact"] = shippingContact.jsonObject
        }
        if let shippingMethod = payment.shippingMethod {
            payload["shippingMethod"] = shippingMethod.jsonObject
        }
        return await routeApplePayAuthorization(payload)
    }

    func routeApplePayAuthorization(_ payload: [String: Any]) async -> PKPaymentAuthorizationResult {
        guard let operationID = coordinator.operationID else { return .init(status: .failure, errors: nil) }
        return await authorizationBridge.suspend(superseding: .init(status: .failure, errors: nil)) { token in
            createRequest(
                operationID: operationID,
                kind: .applePayAuthorization,
                eventKind: EventKind.applePayAuthorization,
                payload: payload
            ) { [weak self] payload in
                let success = payload?["status"] as? String == "success"
                self?.authorizationBridge.resolve(
                    token,
                    .init(status: success ? .success : .failure, errors: self?.applePayErrors(payload))
                )
            }
        }
    }

    func awaitShippingContact(_ contact: PKContact, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestShippingContactUpdate {
        await routeApplePayShippingContact(contact.jsonObject, summaryItems: summaryItems)
    }

    func routeApplePayShippingContact(
        _ payload: [String: Any],
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestShippingContactUpdate {
        currentSummaryItems = summaryItems
        return await applePayUpdate(
            bridge: shippingContactBridge,
            kind: .applePayShippingContact,
            eventKind: EventKind.applePayShippingContact,
            payload: payload
        ) { [weak self] token, payload in
            self?.shippingContactBridge.resolve(token, self?.shippingUpdate(payload) ?? .init(paymentSummaryItems: summaryItems))
        }
    }

    func awaitShippingMethod(_ method: PKShippingMethod, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestShippingMethodUpdate {
        await routeApplePayShippingMethod(method.jsonObject, summaryItems: summaryItems)
    }

    func routeApplePayShippingMethod(
        _ payload: [String: Any],
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestShippingMethodUpdate {
        currentSummaryItems = summaryItems
        return await shippingMethodBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) { token in
            guard let operationID = coordinator.operationID else { return }
            self.createRequest(
                operationID: operationID,
                kind: .applePayShippingMethod,
                eventKind: EventKind.applePayShippingMethod,
                payload: payload
            ) { [weak self] payload in
                self?.shippingMethodBridge.resolve(
                    token,
                    .init(paymentSummaryItems: self?.applePaySummaryItems(payload) ?? summaryItems)
                )
            }
        }
    }

    func awaitCouponCode(_ couponCode: String, summaryItems: [PKPaymentSummaryItem]) async -> PKPaymentRequestCouponCodeUpdate {
        await routeApplePayCouponCode(couponCode, summaryItems: summaryItems)
    }

    func routeApplePayCouponCode(
        _ couponCode: String,
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestCouponCodeUpdate {
        currentSummaryItems = summaryItems
        return await couponCodeBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) { token in
            guard let operationID = coordinator.operationID else { return }
            self.createRequest(
                operationID: operationID,
                kind: .applePayCouponCode,
                eventKind: EventKind.applePayCouponCode,
                payload: ["couponCode": couponCode]
            ) { [weak self] payload in
                guard let self else { return }
                let shippingMethods = self.applePayShippingMethods.applyUpdate(payload)
                self.couponCodeBridge.resolve(
                    token,
                    .init(
                        errors: self.applePayErrors(payload),
                        paymentSummaryItems: self.applePaySummaryItems(payload) ?? summaryItems,
                        shippingMethods: shippingMethods
                    )
                )
            }
        }
    }

    func applePayUpdate(
        bridge: CallbackBridge<PKPaymentRequestShippingContactUpdate>,
        kind: CoordinatorRequestKind,
        eventKind: String,
        payload: [String: Any],
        resume: @escaping (CallbackBridgeToken<PKPaymentRequestShippingContactUpdate>, [String: Any]?) -> Void
    ) async -> PKPaymentRequestShippingContactUpdate {
        await bridge.suspend(superseding: .init(paymentSummaryItems: currentSummaryItems)) { token in
            guard let operationID = coordinator.operationID else { return }
            createRequest(operationID: operationID, kind: kind, eventKind: eventKind, payload: payload) { response in
                resume(token, response)
            }
        }
    }

    func shippingUpdate(_ payload: [String: Any]?) -> PKPaymentRequestShippingContactUpdate {
        let shippingMethods = applePayShippingMethods.applyUpdate(payload)
        return .init(
            errors: applePayErrors(payload),
            paymentSummaryItems: applePaySummaryItems(payload) ?? currentSummaryItems,
            shippingMethods: shippingMethods
        )
    }

    func applePaySummaryItems(_ payload: [String: Any]?) -> [PKPaymentSummaryItem]? {
        guard let raw = payload?["paymentSummaryItems"] as? [[String: Any]] else { return nil }
        let summaryItems = raw.compactMap(PKPaymentSummaryItem.init)
        return summaryItems.isEmpty ? nil : summaryItems
    }

    func applePayErrors(_ payload: [String: Any]?) -> [Error]? {
        guard let raw = payload?["errors"] as? [[String: Any]] else { return nil }
        let errors = raw.compactMap(applePayError)
        return errors.isEmpty ? nil : errors
    }
}

// MARK: - Address lookup

@MainActor
private extension CheckoutTurboModuleAdapter {
    func awaitAddressLookup(_ query: String) async -> [AddressLookupResult] {
        guard let operationID = acquireAddressLookupOperationForCallback() else { return [] }
        return await addressLookupBridge.suspend(superseding: []) { token in
            createRequest(
                operationID: operationID,
                kind: .addressLookupSearch,
                eventKind: EventKind.addressLookupSearch,
                payload: ["query": query]
            ) { [weak self] payload in
                self?.addressLookupBridge.resolve(token, self?.addressLookupResults(payload) ?? [])
            }
        }
    }

    func awaitAddressSelection(_ candidate: AddressLookupResult) async throws -> PostalAddress {
        guard let operationID = acquireAddressLookupOperationForCallback() else {
            throw AddressLookupError.cancelled
        }
        let response = await addressSelectionBridge.suspend(superseding: .failure(AddressLookupError.cancelled)) { token in
            createRequest(
                operationID: operationID,
                kind: .addressLookupSelection,
                eventKind: EventKind.addressLookupSelection,
                payload: [
                    "id": candidate.identifier,
                    "address": candidate.postalAddress.jsonObject
                ]
            ) { [weak self] payload in
                self?.addressSelectionBridge.resolve(token, self?.addressSelection(payload) ?? .failure(AddressLookupError.cancelled))
            }
        }
        coordinator.completeAddressLookupOperation(operationID)
        return try response.get()
    }

    /// Lookup callbacks have a dedicated owner, rather than adopting whatever payment operation
    /// might currently be active. This preserves exact request correlation across search updates.
    func acquireAddressLookupOperationForCallback() -> String? {
        guard let checkoutID = coordinator.checkoutID else { return nil }
        return try? coordinator.acquireAddressLookupOperation(checkoutID: checkoutID)
    }

    func addressLookupResults(_ payload: [String: Any]?) -> [AddressLookupResult] {
        guard let results = payload?["results"],
              let data = try? JSONSerialization.data(withJSONObject: results),
              let decoded = try? JSONDecoder().decode([AddressLookupResult].self, from: data) else {
            return []
        }
        return decoded
    }

    func addressSelection(_ payload: [String: Any]?) -> AddressSelectionResponse {
        if let message = payload?["message"] as? String {
            return .failure(AddressLookupError.rejected(message))
        }
        guard payload?["type"] as? String != "reject",
              let address = payload?["address"],
              let data = try? JSONSerialization.data(withJSONObject: address),
              let postalAddress = try? JSONDecoder().decode(PostalAddress.self, from: data) else {
            return .failure(AddressLookupError.cancelled)
        }
        return .success(postalAddress)
    }
}

extension CheckoutTurboModuleAdapter: PresentationDelegate {
    func present(component: PresentableComponent) {
        guard let presenter = coordinator.topPresenterProvider() else {
            emitTerminal(kind: EventKind.error, payload: terminalErrorPayload)
            return
        }
        let viewController = UINavigationController(rootViewController: component.viewController)
        presenter.present(viewController, animated: true)
        coordinator.presenterStack.append(viewController)
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

internal enum TurboCheckoutTarget: Hashable {
    case paymentMethod(PaymentMethodType)
    case storedPaymentMethod(String)
}

internal func resolveCheckoutTarget(_ target: NSDictionary) throws -> TurboCheckoutTarget {
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

private enum EventKind {
    static let advancedSubmit = "advancedSubmit"
    static let advancedAdditionalDetails = "advancedAdditionalDetails"
    static let sessionBeforeSubmit = "sessionBeforeSubmit"
    static let applePayAuthorization = "applePayAuthorization"
    static let applePayShippingContact = "applePayShippingContact"
    static let applePayShippingMethod = "applePayShippingMethod"
    static let applePayCouponCode = "applePayCouponCode"
    static let addressLookupSearch = "addressLookupSearch"
    static let addressLookupSelection = "addressLookupSelection"
    static let completion = "completion"
    static let error = "error"
}

private enum AddressSelectionResponse {
    case success(PostalAddress)
    case failure(Error)

    func get() throws -> PostalAddress {
        switch self {
        case let .success(address):
            address
        case let .failure(error):
            throw error
        }
    }
}

private enum AddressLookupError: LocalizedError {
    case cancelled
    case rejected(String)

    var errorDescription: String? {
        switch self {
        case .cancelled:
            "Address lookup was cancelled"
        case let .rejected(message):
            message
        }
    }
}

private enum ErrorCode {
    static let invalidConfiguration = "invalidConfiguration"
    static let invalidTarget = "invalidTarget"
    static let staleCheckout = "staleCheckout"
    static let staleRequest = "staleRequest"
    static let operationBusy = "operationBusy"
    static let unsupportedCapability = "unsupportedCapability"
}

private let terminalErrorPayload: [String: Any] = [
    "message": "Checkout failed",
    "errorCode": "checkoutFailed"
]

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
    func releaseCheckoutHost() async {
        let ownedPresenters = CheckoutCoordinator.shared.presenterStack
        for presenter in ownedPresenters.reversed() where presenter.presentingViewController != nil || presenter.presentedViewController != nil {
            await withCheckedContinuation { continuation in
                presenter.dismiss(animated: true) {
                    continuation.resume()
                }
            }
        }
        CheckoutCoordinator.shared.presenterStack.removeAll()
    }
}
