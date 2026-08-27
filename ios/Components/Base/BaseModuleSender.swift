//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension BaseModuleSender: EventEmitter {
    func send(event: EventName, body: Any?) {
        sendEvent(withName: event.rawValue, body: body)
    }
}

internal class BaseModuleSender: BaseModule {

    /// Override for testing. When nil, uses self (RCTEventEmitter).
    internal var emitterOverride: EventEmitter?
    private var emitter: EventEmitter {
        emitterOverride ?? self
    }

    /// Continuation that suspends the `onSubmit` closure until JS returns a ``SubmitResult``.
    internal var submitContinuation: CheckedContinuation<SubmitResult, Never>?

    /// Continuation that suspends the `onAdditionalDetails` closure until JS returns an
    /// ``AdditionalDetailsResult``.
    internal var additionalDetailsContinuation: CheckedContinuation<AdditionalDetailsResult, Never>?
    internal var checkout: BaseCheckout?

    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }

    override open func supportedEvents() -> [String]! {
        [EventName.fail, EventName.submit].map(\.rawValue)
    }

    @objc
    override func constantsToExport() -> [AnyHashable: Any]! {
        ["supportedEvents": supportedEvents() ?? []]
    }

    // MARK: - Event emmiter helpers

    internal func sendEvent(event: EventName) {
        emitter.send(event: event, body: [:])
    }

    internal func sendEvent(event: EventName, body: Any?) {
        emitter.send(event: event, body: body)
    }

    internal func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        emitter.send(event: EventName.submit, body: response.jsonObject)
    }

    internal func sendCompleteEvent(resultCode: CheckoutResultCode) {
        emitter.send(event: EventName.complete, body: [Key.resultCode: resultCode.rawValue])
    }

    internal func sendProvideEvent(actionData: ActionComponentData) {
        emitter.send(event: EventName.additionalDetails, body: actionData.jsonObject)
    }

    // MARK: - JS payment result bridging

    // TODO: providePaymentResult and provideAdditionalDetailsResult removed —
    // continuation resolution is now handled by completion() and retry() in subclasses.

    override internal func sendError(error: Error) {
        let errorToSend = checkErrorType(error)
        if BaseModule.checkoutState?.isSession == true {
            let eventName: EventName = .failSession
            ensureMainThread { [weak self] in
                self?.emitter.send(event: eventName, body: errorToSend.jsonObject)
            }
            return
        }
        ensureMainThread { [weak self] in
            self?.emitter.send(event: EventName.fail, body: errorToSend.jsonObject)
        }
    }

    // MARK: - Cleanup

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.submitContinuation?.resume(returning: errorSubmitResult)
            self?.submitContinuation = nil
            self?.additionalDetailsContinuation?.resume(returning: errorAdditionalDetailsResult)
            self?.additionalDetailsContinuation = nil
            self?.checkout = nil
        }
        super.cleanUp()
    }

    private enum Key {
        static let resultCode = "resultCode"
    }
}
