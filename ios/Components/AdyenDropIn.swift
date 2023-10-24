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
internal final class AdyenDropIn: BaseModule {

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

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)

        let config = DropInConfigurationParser(configuration: configuration).configuration(apiContext: apiContext)
        config.card = CardConfigurationParser(configuration: configuration).configuration

        if let payment = parser.payment {
            config.payment = payment
            (try? ApplepayConfigurationParser(configuration: configuration).buildConfiguration(amount: payment.amount)).map {
                config.applePay = $0
            }
        }

        let dropInComponentStyle = AdyenAppearanceLoader.findStyle() ?? DropInComponent.Style()
        let component = DropInComponent(paymentMethods: paymentMethods,
                                        configuration: config,
                                        style: dropInComponentStyle)
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

extension AdyenDropIn: DropInComponentDelegate {

    func didSubmit(_ data: PaymentComponentData,
                   for paymentMethod: PaymentMethod,
                   from component: DropInComponent) {
        let response: SubmitData
        if let appleData = data as? ApplePayDetails {
            response = SubmitData(paymentData: data.jsonObject, extra: appleData.extraData)
        } else {
            response = SubmitData(paymentData: data.jsonObject, extra: nil)
        }
        sendEvent(event: .didSubmit, body: response.jsonDictionary)
    }

    func didProvide(_ data: ActionComponentData, from component: DropInComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }

    func didComplete(from component: DropInComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    func didFail(with error: Error, from component: DropInComponent) {
        sendEvent(error: error)
    }

}
