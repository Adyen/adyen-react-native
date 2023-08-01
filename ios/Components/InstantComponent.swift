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
        dismiss(success.boolValue)
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let parser = RootConfigurationParser(configuration: configuration)
        let paymentMethod: PaymentMethod
        let clientKey: String
        do {
            paymentMethod = try parseAnyPaymentMethod(from: paymentMethodsDict)
            clientKey = try fetchClientKey(from: parser)
        } catch {
            return sendEvent(error: error)
        }

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        actionHandler = AdyenActionComponent(apiContext: apiContext, style: style)
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
        sendEvent(error: error)
    }

    internal func didComplete(from component: ActionComponent) {
        sendEvent(event: .didComplete, body: nil)
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendEvent(event: .didProvide, body: data.jsonObject)
    }
}
