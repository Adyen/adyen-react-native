//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

/// Singleton class for emitting Adyen events to React Native
@objc(AdyenEventEmitter)
public final class AdyenEventEmitter: NSObject {

    @objc public static let shared = AdyenEventEmitter()

    private weak var eventEmitter: RCTEventEmitter?

    override private init() {
        super.init()
    }

    @objc public func setEventEmitter(_ emitter: RCTEventEmitter?) {
        self.eventEmitter = emitter
    }

    // MARK: - Event Emission

    @objc public func sendSubmitEvent(paymentData: [String: Any], extra: [String: Any]?) {
        let response = SubmitData(paymentData: paymentData, extra: extra)
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }

    @objc public func sendErrorEvent(error: Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(event: .didFail, body: errorToSend.jsonObject)
    }

    @objc public func sendProvideEvent(actionData: [String: Any]) {
        sendEvent(event: .didProvide, body: actionData)
    }

    @objc public func sendCompleteEvent() {
        let result = ResultDTO(result: .presentToShopper)
        sendEvent(event: .didComplete, body: result.jsonObject)
    }

    @objc public func sendBinValueEvent(binValue: String) {
        sendEvent(event: .didChangeBinValue, body: binValue)
    }

    @objc public func sendBinLookupEvent(brands: [String]) {
        sendEvent(event: .didBinLookup, body: brands)
    }

    // MARK: - Private Helpers

    private func sendEvent(event: Events, body: Any?) {
        eventEmitter?.sendEvent(withName: event.rawValue, body: body)
    }

    private func checkErrorType(_ error: Error) -> Error {
        if error.isComponentCanceled || error.is3DSCanceled {
            return BaseModule.NativeModuleError.canceled
        }
        return error
    }
}
