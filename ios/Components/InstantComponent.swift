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
    
    private var currentComponent: PresentableComponent?
    private var currentPaymentComponent: PaymentComponent?
    private var actionHandler: AdyenActionComponent?
    
    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() {}
    override func startObserving() {}
    override func supportedEvents() -> [String]! { super.supportedEvents() }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        DispatchQueue.main.async {[weak self] in
            guard let self = self else { return }
            
            self.currentComponent?.finalizeIfNeeded(with: success.boolValue)
            self.actionHandler?.currentActionComponent?.cancelIfNeeded()
            self.actionHandler = nil
            self.currentComponent = nil
            self.currentPaymentComponent = nil
        }
    }

    @objc
    func open(_ paymentMethods: NSDictionary, configuration: NSDictionary) {
        let paymentMethod: RedirectPaymentMethod
        do {
            paymentMethod = try parsePaymentMethods(jsonData: paymentMethods, for: RedirectPaymentMethod.self)
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
        currentPaymentComponent = component
        component.delegate = self
        
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

extension InstantComponent: PresentationDelegate {

    private static var presenter: UIViewController? { UIApplication.shared.keyWindow?.rootViewController }

    func present(component: PresentableComponent) {
        DispatchQueue.main.async { [weak self] in
            self?.present(component)
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
            InstantComponent.presenter?.present(component.viewController,
                                                animated: true)
            return
        }

        let navigation = UINavigationController(rootViewController: component.viewController)
        component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                           target: self,
                                                                           action: #selector(cancelDidPress))
        InstantComponent.presenter?.present(navigation, animated: true)
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendEvent(event: .didFail, body: ComponentError.cancelled.toDictionary)
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
