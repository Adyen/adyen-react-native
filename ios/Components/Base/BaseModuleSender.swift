//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

extension BaseModuleSender: EventEmitter {
    func send(event: Events, body: Any?) {
        sendEvent(withName: event.rawValue, body: body)
    }
}

internal class BaseModuleSender: BaseModule {

    /// Override for testing. When nil, uses self (RCTEventEmitter).
    internal var emitterOverride: EventEmitter?
    private var emitter: EventEmitter {
        emitterOverride ?? self
    }

    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }
    
    override open func supportedEvents() -> [String]! {
        []
    }

    @objc
    override func constantsToExport() -> [AnyHashable: Any]! {
        ["supportedEvents": supportedEvents() ?? []]
    }

    // MARK: - Event emmiter helpers

    internal func sendEvent(event: Events) {
        emitter.send(event: event, body: [:])
    }

    internal func sendEvent(event: Events, body: Any?) {
        emitter.send(event: event, body: body)
    }

    internal func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        emitter.send(event: Events.submit, body: response.jsonObject)
    }

    internal func sendCompleteEvent() {
        let result = ResultDTO(result: .presentToShopper)
        emitter.send(event: Events.complete, body: result.jsonObject)
    }

    internal func sendProvideEvent(actionData: ActionComponentData) {
        emitter.send(event: Events.provide, body: actionData.jsonObject)
    }

    override internal func sendError(error: Error) {
        let errorToSend = checkErrorType(error)
        if let _ = BaseModule.session {
            BaseModule.sessionDelegate?.sendError(error: error)
            return
        }
        emitter.send(event: Events.fail, body: errorToSend.jsonObject)
    }

}
