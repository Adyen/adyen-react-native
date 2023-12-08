//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import PassKit
import React

@objc(AdyenDropIn)
internal final class DropInModule: BaseModule {

    override public func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

    private var dropInComponent: DropInComponent? {
        currentComponent as? DropInComponent
    }
    
    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethods: PaymentMethods
        let clientKey: String
        do {
            paymentMethods = try parsePaymentMethods(from: paymentMethodsDict)
            clientKey = try fetchClientKey(from: parser)
        } catch {
            return sendEvent(error: error)
        }

        AdyenLogging.isEnabled = true

        guard let apiContext = try? APIContext(environment: parser.environment, clientKey: clientKey) else { return }
        let config = DropInConfigurationParser(configuration: configuration).configuration
        config.card = CardConfigurationParser(configuration: configuration).dropinConfiguration
        config.style = AdyenAppearanceLoader.findStyle() ?? DropInComponent.Style()

        let context: AdyenContext
        if let payment = parser.payment {
            (try? ApplepayConfigurationParser(configuration: configuration).buildConfiguration(payment: payment)).map {
                config.applePay = $0
            }

            // TODO: add analyticsConfiguration: AnalyticsConfiguration()
            context = AdyenContext(apiContext: apiContext, payment: payment)
        } else {
            context = AdyenContext(apiContext: apiContext, payment: nil, analyticsConfiguration: AnalyticsConfiguration())
        }


        let component = DropInComponent(paymentMethods: paymentMethods,
                                        context: context,
                                        configuration: config)
        currentComponent = component
        component.delegate = self
        present(component: component)
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
            self?.dropInComponent?.handle(action)
        }
    }

}

extension DropInModule: DropInComponentDelegate {
    func didSubmit(_ data: Adyen.PaymentComponentData, from component: Adyen.PaymentComponent, in dropInComponent: Adyen.AnyDropInComponent) {
        let response: SubmitData
        if let appleData = data.paymentMethod as? ApplePayDetails {
            response = SubmitData(paymentData: data.jsonObject, extra: appleData.extraData)
        } else {
            response = SubmitData(paymentData: data.jsonObject, extra: nil)
        }
        sendEvent(event: .didSubmit, body: response.jsonObject)
    }
    
    func didFail(with error: Error, from component: Adyen.PaymentComponent, in dropInComponent: Adyen.AnyDropInComponent) {
        sendEvent(error: error)
    }
    
    func didProvide(_ data: Adyen.ActionComponentData, from component: Adyen.ActionComponent, in dropInComponent: Adyen.AnyDropInComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }
    
    func didComplete(from component: Adyen.ActionComponent, in dropInComponent: Adyen.AnyDropInComponent) {
        sendEvent(event: .didComplete, body: nil)
    }
    
    func didFail(with error: Error, from component: Adyen.ActionComponent, in dropInComponent: Adyen.AnyDropInComponent) {
        sendEvent(error: error)
    }
    
    func didFail(with error: Error, from dropInComponent: Adyen.AnyDropInComponent) {
        sendEvent(error: error)
    }
}
