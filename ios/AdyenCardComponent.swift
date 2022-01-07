//
//  AdyenCardComponent.swift
//  AdyenReactNative
//
//  Created by Vladimir Abramichev on 11/01/2022.
//

import Foundation
import Adyen
import React

@objc(AdyenCardComponent)
internal class AdyenCardComponent: RCTEventEmitter {

    private var currentComponent: PresentableComponent?
    private var actionHandler: AdyenActionComponent?

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() { }
    override func startObserving() { }

    override func supportedEvents() -> [String]! {
        ["didSubmitCallback", "didProvideCallback", "didCompleteCallback", "didFailCallback"]
    }

    @objc
    func hide() {
        actionHandler = nil
        currentComponent = nil
        DispatchQueue.main.async {
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true, completion: nil)
        }
    }

    @objc
    func open(_ paymentMethods : NSDictionary, configuration: NSDictionary) {
        guard let data = try? JSONSerialization.data(withJSONObject: paymentMethods, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data),
              let paymentMethod = paymentMethods.paymentMethod(ofType: CardPaymentMethod.self)
        else { return }

        guard
            let environment = configuration["environment"] as? String,
            let clientKey = configuration["clientKey"] as? String
        else { return }

        let apiContext = APIContext(environment: Environment.parse(environment), clientKey: clientKey)
        actionHandler = AdyenActionComponent(apiContext: apiContext)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self

        let config = CardComponent.Configuration()
        let component = CardComponent(paymentMethod: paymentMethod,
                                      apiContext: apiContext,
                                      configuration: config)
        component.delegate = self
        currentComponent = component

        if let paymentObject = configuration["amount"] as? [String: Any],
           let paymentAmount = paymentObject["value"] as? Int,
           let countryCode = configuration["countryCode"] as? String,
           let currencyCode = paymentObject["currency"] as? String {
            component.payment = Payment(amount: Amount(value: paymentAmount,
                                                       currencyCode: currencyCode),
                                        countryCode: countryCode)
        }

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
        if let component = component as? PaymentAwareComponent {
            component.payment = (currentComponent as? PaymentAwareComponent)?.payment
        }

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
        AdyenCardComponent.presenter?.dismiss(animated: true)
    }
}



extension AdyenCardComponent: PaymentComponentDelegate {

    internal func didSubmit(_ data: PaymentComponentData, from component: PaymentComponent) {
        sendEvent(withName: "didSubmitCallback", body: data.jsonObject)
    }

    internal func didFail(with error: Error, from component: PaymentComponent) {
        sendEvent(withName: "didFailCallback", body: error.toDictionary)
    }

}

extension AdyenCardComponent: ActionComponentDelegate {

    internal func didFail(with error: Error, from component: ActionComponent) {
        sendEvent(withName: "didFailCallback", body: error.toDictionary)
    }

    internal func didComplete(from component: ActionComponent) {
        sendEvent(withName: "didCompleteCallback", body: nil)
    }

    internal func didProvide(_ data: ActionComponentData, from component: ActionComponent) {
        sendEvent(withName: "didProvideCallback", body: data.jsonObject)
    }
}
