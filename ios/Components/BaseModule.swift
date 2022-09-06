//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React
import UIKit
import Adyen

internal class BaseModule: RCTEventEmitter {
    
    internal var currentComponent: PresentableComponent?
    internal var currentPresenter: UIViewController?
    
    private enum Error: LocalizedError {
        case deserializationError
        case parsingError
        case paymentMethodNotFound(PaymentMethod.Type)
        
        var errorDescription: String? {
            switch self {
            case .deserializationError:
                return "Can not deserialize paymentMethods"
            case .parsingError:
                return "Can not parse payment method"
            case let .paymentMethodNotFound(type):
                return "Can not find payment method of type \(type) in provided list"
            }
        }
    }
    
    internal func present(_ component: PresentableComponent) {
        if let paymentComponent = component as? PaymentComponent {
            paymentComponent.delegate = self as? PaymentComponentDelegate
        }

        if let actionComponent = component as? ActionComponent {
            actionComponent.delegate = self as? ActionComponentDelegate
        }

        currentComponent = component
        currentPresenter = UIViewController.topPresenter
        guard component.requiresModalPresentation else {
            currentPresenter?.present(component.viewController, animated: true)
            return
        }

        let navigation = UINavigationController(rootViewController: component.viewController)
        component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                           target: self,
                                                                           action: #selector(cancelDidPress))
        currentPresenter?.present(navigation, animated: true)
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendEvent(event: .didFail, body: ComponentError.cancelled.toDictionary)
    }

    override open func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }
        
    internal func sendEvent(event: Events, body: Any!) {
        self.sendEvent(withName: event.rawValue, body: body)
    }
    
    internal func parsePaymentMethods(from dicionary: NSDictionary) throws -> PaymentMethods {
        let paymentMethods: PaymentMethods
        
        guard let data = try? JSONSerialization.data(withJSONObject: dicionary, options: []) else {
            throw Error.deserializationError
        }
        
        if let jsonPaymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data) {
            paymentMethods = jsonPaymentMethods
        }
        else {
            throw Error.parsingError
        }
        
        return paymentMethods
    }
    
    internal func parsePaymentMethod<T: PaymentMethod>(from dicionary: NSDictionary, for type: T.Type) throws -> T {
        let paymentMethods = try parsePaymentMethods(from: dicionary)
        
        guard let paymentMethod = paymentMethods.paymentMethod(ofType: type) else {
            throw Error.paymentMethodNotFound(type)
        }
        
        return paymentMethod
    }
    
    internal func parseFirstPaymentMethod(from dicionary: NSDictionary) throws -> PaymentMethod {
        let paymentMethods = try parsePaymentMethods(from: dicionary)
        
        guard let paymentMethod = paymentMethods.regular.first else {
            throw Error.parsingError
        }
        
        return paymentMethod
    }
    
}
