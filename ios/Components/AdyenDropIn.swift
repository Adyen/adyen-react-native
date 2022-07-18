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
internal class AdyenDropIn: BaseModule {

    private var dropInComponent: DropInComponent?

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() {}
    override func startObserving() {}
    override func supportedEvents() -> [String]! { super.supportedEvents() }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {
            self.dropInComponent?.finalizeIfNeeded(with: success.boolValue)
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true)
            self.dropInComponent = nil
        }
    }

    @objc
    func open(_ paymentMethods: NSDictionary, configuration: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data)
        else { return }
        
        let parser = ConfigurationParser(configuration: configuration)

        guard let clientKey = parser.clientKey else {
            return assertionFailure("AdyenDropIn: No clientKey in configuration")
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
        component.delegate = self
        dropInComponent = component

        DispatchQueue.main.async {
            UIApplication.shared.keyWindow?.rootViewController?.present(
                component.viewController,
                animated: true,
                completion: nil
            )
        }
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
