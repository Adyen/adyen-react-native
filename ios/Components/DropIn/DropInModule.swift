//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React

@objc(AdyenDropIn)
internal final class DropInModule: BaseAddressModule {

    internal var disableStoredPaymentMethodHandler: Adyen.Completion<Bool>?
    internal var requestOrderHandler: ((Result<PartialPaymentOrder, any Error>) -> Void)?
    internal var checkBalanceHandler: ((Result<Balance, any Error>) -> Void)?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + (EventName.cardEvents + EventName.dropInEvents).map(\.rawValue)
    }

    @objc
    func removeStored(_ success: NSNumber) {
        ensureMainThread { [weak self] in
            self?.disableStoredPaymentMethodHandler?(success.boolValue)
        }
    }

    @objc
    func start(_ paymentMethodsDict: NSDictionary) {
        // TODO: v6 migration - Drop-in presentation not yet migrated.
        // Get configuration from BaseModule.checkoutState?.checkoutContext if needed.
        sendError(error: ModuleException.notSupported)
    }

    @objc
    override func action(_ dictionary: NSDictionary) {
        // TODO: v6 migration - action handling requires a reference to the active checkout.
        sendError(error: ModuleException.notSupported)
    }

    @objc
    func getReturnURL(_ resolver: @escaping RCTPromiseResolveBlock,
                      rejecter _: @escaping RCTPromiseRejectBlock) {
        resolver(nil)
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.disableStoredPaymentMethodHandler = nil
            self?.requestOrderHandler = nil
            self?.checkBalanceHandler = nil
        }
        super.cleanUp()
    }

}
