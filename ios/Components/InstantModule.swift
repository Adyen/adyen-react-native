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

    internal enum LaunchStyle: Equatable {
        case initiatePayment
        case present
    }

    internal enum Flow {
        case payByBankUS(PayByBankUSPaymentMethod)
        case issuerList(IssuerListPaymentMethod)
        case instant(PaymentMethod)

        var launchStyle: LaunchStyle {
            switch self {
            case .instant:
                return .initiatePayment
            case .payByBankUS, .issuerList:
                return .present
            }
        }
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

    /// Creates the appropriate `PaymentComponent` for a given `Flow`. Pure factory — no module state required.
    internal static func makeComponent(for flow: Flow, context: AdyenContext) -> PaymentComponent {
        switch flow {
        case let .payByBankUS(pm):
            return PayByBankUSComponent(paymentMethod: pm, context: context)
        case let .issuerList(pm):
            return IssuerListComponent(paymentMethod: pm, context: context)
        case let .instant(pm):
            return InstantPaymentComponent(paymentMethod: pm, context: context, order: nil)
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

        let flow = InstantModule.flow(for: paymentMethod)
        let component = InstantModule.makeComponent(for: flow, context: context)
        component.delegate = BaseModule.session ?? self
        currentComponent = component

        ensureMainThread { [weak self] in
            self?.launch(component, style: flow.launchStyle)
        }
    }

    // MARK: - Private

    private func launch(_ component: PaymentComponent, style: LaunchStyle) {
        switch style {
        case .initiatePayment:
            (component as? InstantPaymentComponent)?.initiatePayment()
        case .present:
            if let presentable = component as? PresentableComponent {
                present(component: presentable)
            }
        }
    }

}
