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
internal final class InstantModule: BaseModule {

    override public func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

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

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        var config = AdyenActionComponent.Configuration(style: style)
        if let locale = BaseModule.session?.sessionContext.shopperLocale ??  parser.shopperLocale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }

        actionHandler = AdyenActionComponent(context: context, configuration: config)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self

        SessionHelperModule.sessionListener = self
        let component = InstantPaymentComponent(paymentMethod: paymentMethod, context: context, order: nil)
        component.delegate = BaseModule.session ?? self
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

extension InstantModule: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        let response = SubmitData(paymentData: data.jsonObject, extra: nil)
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(event: .didFail, body: error.jsonObject)
    }

}

extension InstantModule: ActionComponentDelegate {

    internal func didFail(with error: Error, from component: ActionComponent) {
        sendEvent(error: error)
    }

    internal func didComplete(from component: ActionComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }
}
