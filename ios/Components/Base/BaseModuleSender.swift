//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseModuleSender: BaseModule {

    /// Suspended advanced-flow closures for this module, resumed once JS returns a result.
    internal let resultSink = AdvancedResultSink()

    internal var checkout: BaseCheckout?

    override open func supportedEvents() -> [String]! {
        [EventName.fail, EventName.submit].map(\.rawValue)
    }

    // MARK: - Event emmiter helpers

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
            self?.resultSink.cancelPending()
            self?.checkout = nil
        }
        super.cleanUp()
    }

    private enum Key {
        static let resultCode = "resultCode"
    }
}
