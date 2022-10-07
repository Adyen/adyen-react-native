//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React
import UIKit

@objc(AdyenCardComponent)
final internal class AdyenCardComponent: BaseModule {

    override func supportedEvents() -> [String]! { super.supportedEvents() }
    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            self.currentComponent?.finalizeIfNeeded(with: true, completion: {
                self.cleanUp()
            })
        }
    }

    @objc
    func open(_ paymentMethodsDict: NSDictionary, configuration: NSDictionary) {
        let paymentMethod: CardPaymentMethod
        do {
            paymentMethod = try parsePaymentMethod(from: paymentMethodsDict, for: CardPaymentMethod.self)
        } catch {
            return assertionFailure("AdyenCardComponent: \(error.localizedDescription)")
        }

        let parser = RootConfigurationParser(configuration: configuration)
        guard let clientKey = parser.clientKey else {
            return assertionFailure("AdyenCardComponent: No clientKey in configuration")
        }

        let apiContext = APIContext(environment: parser.environment, clientKey: clientKey)

        actionHandler = AdyenActionComponent(apiContext: apiContext)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self

        let config = CardConfigurationParser(configuration: configuration).configuration
        let component = CardComponent(paymentMethod: paymentMethod,
                                      apiContext: apiContext,
                                      configuration: config)
        component.payment = parser.payment
        present(component: component)
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

extension AdyenCardComponent: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        sendEvent(event: .didSubmit, body: data.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(event: .didFail, body: error.toDictionary)
    }

}

extension AdyenCardComponent: ActionComponentDelegate {

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
