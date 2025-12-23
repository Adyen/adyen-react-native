//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenInstant)
internal final class InstantModule: BaseModuleSender {

    override func supportedEvents() -> [String]! { Events.coreEvents.map(\.rawValue) }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethod: PaymentMethod
        let context: AdyenContext
        do {
            paymentMethod = try parseAnyPaymentMethod(from: paymentMethodsDict)
            context = try parser.fetchContext(session: BaseModule.session)
        } catch {
            return sendEvent(error: error)
        }

        let component = InstantPaymentComponent(paymentMethod: paymentMethod, context: context, order: nil)
        if let session = BaseModule.session {
            SessionHelperModule.sessionListener = self
            component.delegate = session
        } else {
            createActionHandler(context: context, locale: parser.shopperLocale)
            component.delegate = self
        }

        currentComponent = component

        DispatchQueue.main.async {
            component.initiatePayment()
        }
    }

    @objc
    func handle(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendEvent(error: error)
        }

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }

}
