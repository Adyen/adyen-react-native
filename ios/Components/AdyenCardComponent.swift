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
internal class AdyenCardComponent: BaseModule {

    private var currentComponent: PresentableComponent?
    private var actionHandler: AdyenActionComponent?

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() {}
    override func startObserving() {}
    override func supportedEvents() -> [String]! { super.supportedEvents() }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {
            self.currentComponent?.finalizeIfNeeded(with: success.boolValue)
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true)

            self.actionHandler = nil
            self.currentComponent = nil
        }
    }

    @objc
    func open(_ paymentMethods: NSDictionary, configuration: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data),
              let paymentMethod = paymentMethods.paymentMethod(ofType: CardPaymentMethod.self)
        else { return }

        let parser = ConfigurationParser(configuration: configuration)
        guard let clientKey = parser.clientKey else {
            return assertionFailure("AdyenDropIn: No clientKey in configuration")
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

extension AdyenCardComponent: PresentationDelegate {

    private static var presenter: UIViewController? { UIApplication.shared.keyWindow?.rootViewController }

    func present(component: PresentableComponent) {
        DispatchQueue.main.async {
            self.present(component)
        }
    }

    private func present(_ component: PresentableComponent) {
        if let paymentComponent = component as? PaymentComponent {
            paymentComponent.delegate = self
        }

        if let actionComponent = component as? ActionComponent {
            actionComponent.delegate = self
        }

        currentComponent = component
        guard component.requiresModalPresentation else {
            AdyenCardComponent.presenter?.present(component.viewController,
                                                  animated: true)
            return
        }

        let navigation = UINavigationController(rootViewController: component.viewController)
        component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                           target: self,
                                                                           action: #selector(cancelDidPress))
        AdyenCardComponent.presenter?.present(navigation, animated: true)
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendEvent(event: .didFail, body: ComponentError.cancelled.toDictionary)
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
