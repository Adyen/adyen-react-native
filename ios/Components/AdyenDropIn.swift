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
final internal class AdyenDropIn: BaseModule {

    private var dropInComponent: DropInComponent?

    override func supportedEvents() -> [String]! { super.supportedEvents() }
    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.dropInComponent?.finalizeIfNeeded(with: success.boolValue) {
                self.cleanUp()
                self.dropInComponent = nil
            }
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let paymentMethods: PaymentMethods
        do {
            paymentMethods = try parsePaymentMethods(from: paymentMethodsDict)
        } catch {
            return assertionFailure("AdyenDropIn: \(error.localizedDescription)")
        }

        let parser = RootConfigurationParser(configuration: configuration)

        guard let clientKey = parser.clientKey else {
            return assertionFailure("AdyenDropIn: No clientKey in configuration.")
        }

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)

        let config = DropInConfigurationParser(configuration: configuration).configuration(apiContext: apiContext)
        config.card = CardConfigurationParser(configuration: configuration).configuration

        if let payment = parser.payment {
            config.payment = payment

            // Apple Pay
            if let applepayConfig = ApplepayConfigurationParser(configuration: configuration).tryConfiguration(amount: payment.amount) {
                config.applePay = applepayConfig
            }
        }

        let dropInComponentStyle = DropInComponent.Style()
        let component = DropInComponent(paymentMethods: paymentMethods,
                                        configuration: config,
                                        style: dropInComponentStyle)
        dropInComponent = component
        dropInComponent?.delegate = self
        present(component: component)
    }

    @objc
    func handle(_ action: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: action, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data)
        else { return }

        DispatchQueue.main.async { [weak self] in
            self?.dropInComponent?.handle(action)
        }
    }

}

extension AdyenDropIn: DropInComponentDelegate {

    func didSubmit(_ data: PaymentComponentData,
                   for paymentMethod: PaymentMethod,
                   from component: DropInComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    func didProvide(_ data: ActionComponentData, from component: DropInComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }

    func didComplete(from component: DropInComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    func didFail(with error: Error, from component: DropInComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

}
