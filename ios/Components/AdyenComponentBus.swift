//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

@objc(AdyenComponentBus)
internal final class AdyenComponentBusModule: BaseModuleSender {

    @objc static var shared: AdyenComponentBusModule?
    internal static var staticActionHandler: AdyenActionComponent?

    override func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

    override init() {
        super.init()
        Self.shared = self
    }

    @objc
    func hide(_ success: NSNumber, message: NSDictionary?) {
        dismiss(success.boolValue)
    }

    @objc
    func handle(_ actionMap: NSDictionary?) {
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