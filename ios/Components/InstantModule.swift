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
internal final class InstantModule: BaseActionHandler {

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethod: PaymentMethod
        let context: AdyenContext
        do {
            paymentMethod = try parseAnyPaymentMethod(from: paymentMethodsDict)
            context = try parser.fetchContext(session: BaseModule.session)
        } catch {
            return sendError(error: error)
        }

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        let locale = BaseModule.session?.sessionContext.shopperLocale ?? parser.shopperLocale

        createActionHandlerIfNeeded(context: context, locale: locale)

        let component = InstantPaymentComponent(paymentMethod: paymentMethod, context: context, order: nil)
        component.delegate = BaseModule.session ?? self
        currentComponent = component

        DispatchQueue.main.async {
            component.initiatePayment()
        }
    }

}
