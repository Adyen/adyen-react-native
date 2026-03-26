//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React
import UIKit

@objc(AdyenGooglePay)
internal class GooglePayModuleMock: BaseModuleSender {

    override func supportedEvents() -> [String]! {
        EventName.coreEvents.map(\.rawValue)
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        sendError(error: ModuleException.notSupported)
    }

    @objc
    func isAvailable(_ paymentMethodDict: NSDictionary,
                     configuration: NSDictionary,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        resolver(false)
    }
}
