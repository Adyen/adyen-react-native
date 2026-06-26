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
internal final class InstantModule: BaseActionModule {

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

        let locale = BaseModule.session?.sessionContext.shopperLocale ?? parser.shopperLocale

        createActionHandlerIfNeeded(context: context, locale: locale)

        let component: PaymentComponent
        switch paymentMethod {
        case let bankMethod as PayByBankUSPaymentMethod:
            component = PayByBankUSComponent(paymentMethod: bankMethod, context: context)
        case let issuerMethod as IssuerListPaymentMethod:
            component = IssuerListComponent(paymentMethod: issuerMethod, context: context)
        default:
            component = InstantPaymentComponent(paymentMethod: paymentMethod, context: context, order: nil)
        }

        component.delegate = BaseModule.session ?? self
        currentComponent = component

        if let instantComponent = component as? InstantPaymentComponent {
            DispatchQueue.main.async {
                instantComponent.initiatePayment()
            }
        } else if let presentableCompomponent = component as? PresentableComponent {
            present(component: presentableCompomponent)
        }
    }

    // MARK: - Presentation

    @objc private func closeButtonPressed() {
        sendError(error: ModuleException.canceled)
        dismiss(false)
    }

}
