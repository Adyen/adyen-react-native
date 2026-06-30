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

    // MARK: - Internal

    internal enum Flow {
        case payByBankUS(PayByBankUSPaymentMethod)
        case issuerList(IssuerListPaymentMethod)
        case instant(PaymentMethod)
    }

    /// Maps a `PaymentMethod` to the matching `Flow`. Pure logic — no context required.
    internal static func flow(for paymentMethod: PaymentMethod) -> Flow {
        switch paymentMethod {
        case let bankMethod as PayByBankUSPaymentMethod:
            return .payByBankUS(bankMethod)
        case let issuerMethod as IssuerListPaymentMethod:
            return .issuerList(issuerMethod)
        default:
            return .instant(paymentMethod)
        }
    }

    // MARK: - React Methods

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
        switch InstantModule.flow(for: paymentMethod) {
        case let .payByBankUS(bankMethod):
            component = PayByBankUSComponent(paymentMethod: bankMethod, context: context)
        case let .issuerList(issuerMethod):
            component = IssuerListComponent(paymentMethod: issuerMethod, context: context)
        case let .instant(method):
            component = InstantPaymentComponent(paymentMethod: method, context: context, order: nil)
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

}
