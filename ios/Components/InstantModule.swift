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

    internal enum PaymentFlow {
        case submit(InstantPaymentComponent)
        case present(PaymentComponent & PresentableComponent)

        var paymentComponent: PaymentComponent {
            switch self {
            case let .submit(instant):
                return instant
            case let .present(presentable):
                return presentable
            }
        }
    }

    internal enum PaymentFlowType {
        case payByBankUS(PayByBankUSPaymentMethod)
        case issuerList(IssuerListPaymentMethod)
        case instant(PaymentMethod)

        internal init(_ paymentMethod: PaymentMethod) {
            switch paymentMethod {
            case let pm as PayByBankUSPaymentMethod: self = .payByBankUS(pm)
            case let pm as IssuerListPaymentMethod: self = .issuerList(pm)
            default: self = .instant(paymentMethod)
            }
        }

        internal func buildFlow(with context: AdyenContext) -> PaymentFlow {
            switch self {
            case let .payByBankUS(pm):
                return .present(PayByBankUSComponent(paymentMethod: pm, context: context))
            case let .issuerList(pm):
                return .present(IssuerListComponent(paymentMethod: pm, context: context))
            case let .instant(pm):
                return .submit(InstantPaymentComponent(paymentMethod: pm, context: context, order: nil))
            }
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

        let flow = PaymentFlowType(paymentMethod).buildFlow(with: context)

        flow.paymentComponent.delegate = BaseModule.session ?? self
        currentComponent = flow.paymentComponent

        launch(flow)
    }

    // MARK: - Private

    private func launch(_ type: PaymentFlow) {
        switch type {
        case let .submit(instant):
            ensureMainThread {
                instant.initiatePayment()
            }
        case let .present(presentable):
            present(component: presentable)
        }
    }

}
