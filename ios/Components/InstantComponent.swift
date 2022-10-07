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
final internal class InstantComponent: BaseModule {
    override func supportedEvents() -> [String]! { super.supportedEvents() }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {[weak self] in
            guard let self = self else { return }
            
            self.currentComponent?.finalizeIfNeeded(with: success.boolValue) {
                self.cleanUp()
            }
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let paymentMethod: PaymentMethod
        do {
            paymentMethod = try parseFirstPaymentMethod(from: paymentMethodsDict)
        } catch {
            return assertionFailure("InstantComponent: \(error.localizedDescription)")
        }

        let parser = RootConfigurationParser(configuration: configuration)
        guard let clientKey = parser.clientKey else {
            return assertionFailure("InstantComponent: No clientKey in configuration")
        }

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)

        actionHandler = AdyenActionComponent(apiContext: apiContext)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self

        let component = InstantPaymentComponent(paymentMethod: paymentMethod, paymentData: nil, apiContext: apiContext)
        component.payment = parser.payment
        component.delegate = self
        currentComponent = component
        
        DispatchQueue.main.async {
            component.initiatePayment()
        }
    }

    @objc
    func handle(_ action: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: action, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data)
        else { return }

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }

}

extension InstantComponent: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

}

extension InstantComponent: ActionComponentDelegate {

    internal func didFail(with error: Error, from component: ActionComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

    internal func didComplete(from component: ActionComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }
}
