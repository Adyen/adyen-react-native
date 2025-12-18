//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

@objc(AdyenMessageBus)
internal final class MessageBusModule: BaseModule {

    internal static var consumers: [String: Any] = [:]
    internal static var currentComponent: String?

    override func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

    override func startObserving() {
        super.startObserving()
        AdyenEventEmitter.shared.setEventEmitter(self)
    }

    override func stopObserving() {
        super.stopObserving()
        AdyenEventEmitter.shared.setEventEmitter(nil)
    }

    @objc
    func hide(_ success: NSNumber, message: NSDictionary?) {
        dismiss(success.boolValue)
    }

    @objc
    func handle(_ actionMap: NSDictionary?) {
        guard let name = MessageBusModule.currentComponent else {
            return sendEvent(error: NativeModuleError.noPayment)
        }

        guard MessageBusModule.consumers[name] != nil else {
            return sendEvent(error: NativeModuleError.notSupported)
        }

        guard let actionMap else {
            return sendEvent(error: NativeModuleError.invalidAction)
        }

        let action: Action
        do {
            action = try parseAction(from: actionMap)
        } catch {
            return sendEvent(error: error)
        }

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }
}
