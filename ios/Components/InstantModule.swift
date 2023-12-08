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
        let clientKey: String
        do {
            paymentMethod = try parseAnyPaymentMethod(from: paymentMethodsDict)
            clientKey = try fetchClientKey(from: parser)
        } catch {
            return sendEvent(error: error)
        }

        guard let apiContext = try? APIContext(environment: parser.environment, clientKey: clientKey) else { return }

        // TODO: add analyticsConfiguration: AnalyticsConfiguration()
        let context = AdyenContext(apiContext: apiContext, payment: nil)

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        actionHandler = AdyenActionComponent(context: context, configuration: .init(style: style))
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self

        let component = InstantPaymentComponent(paymentMethod: paymentMethod, context: context, order: nil)
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
