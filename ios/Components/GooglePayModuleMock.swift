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

    @objc
    func open(_ paymentMethodsDict _: NSDictionary, configuration _: NSDictionary) {
        sendError(error: ModuleException.notSupported)
    }

    @objc
    func isAvailable(_ paymentMethodDict _: NSDictionary,
                     configuration _: NSDictionary,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter _: @escaping RCTPromiseRejectBlock) {
        resolver(false)
    }
}
