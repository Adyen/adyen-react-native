//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React
import UIKit
import Adyen
import Adyen3DS2

internal class BaseModule: RCTEventEmitter {
        
    @objc
    override static func requiresMainQueueSetup() -> Bool { return true }
    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }
    override open func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }

    internal var currentComponent: Component?
    internal var currentPaymentComponent: PaymentComponent? {
        currentComponent as? PaymentComponent
    }
    internal var currentPresentableComponent: PresentableComponent? {
        currentComponent as? PresentableComponent
    }
    internal var currentPresenter: UIViewController?
    internal var actionHandler: AdyenActionComponent?
    
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
        sendEvent(error: NativeModuleError.canceled)
    }
        
    internal func sendEvent(event: Events, body: Any!) {
        sendEvent(withName: event.rawValue, body: body)
    }
    
    internal func sendEvent(error: Swift.Error) {
        let errorToSend: Error
        if let componentError = (error as? ComponentError), componentError == ComponentError.cancelled {
            errorToSend = NativeModuleError.canceled
        } else if
            (error as NSError).domain == "com.adyen.Adyen3DS2.ADYRuntimeError",
            (error as NSError).code == ADYRuntimeErrorCode.challengeCancelled.rawValue {
            errorToSend = NativeModuleError.canceled
        } else {
            errorToSend = error
        }
        sendEvent(withName: Events.didFail.rawValue, body: errorToSend.toDictionary)
    }
    
    internal func parsePaymentMethods(from dicionary: NSDictionary) throws -> PaymentMethods {
        guard let data = try? JSONSerialization.data(withJSONObject: dicionary, options: []),
              let paymentMethods = try? JSONDecoder().decode(PaymentMethods.self, from: data)
        else {
            throw NativeModuleError.invalidPaymentMethods
        }
        
        return paymentMethods
    }
    
    internal func parseAction(from dicionary: NSDictionary) throws -> Action {
        guard let data = try? JSONSerialization.data(withJSONObject: dicionary, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data)
        else {
            throw NativeModuleError.invalidAction
        }
        return action
    }
    
    internal func fetchClientKey(from parser: RootConfigurationParser) throws -> String {
        guard let clientKey = parser.clientKey else {
            throw NativeModuleError.noClientKey
        }
        return clientKey
    }
    
    internal func fetchPayment(from parser: RootConfigurationParser) throws -> Payment {
        guard let payment = parser.payment else {
            throw NativeModuleError.noPayment
        }
        return payment
    }
    
    internal func parsePaymentMethod<T: PaymentMethod>(from dicionary: NSDictionary, for type: T.Type) throws -> T {
        let paymentMethods = try parsePaymentMethods(from: dicionary)
        
        guard let paymentMethod = paymentMethods.paymentMethod(ofType: type) else {
            throw NativeModuleError.paymentMethodNotFound(type)
        }
        
        return paymentMethod
    }
    
    internal func parseAnyPaymentMethod(from dicionary: NSDictionary) throws -> PaymentMethod {
        let paymentMethods = try parsePaymentMethods(from: dicionary)
        
        guard let paymentMethod = paymentMethods.regular.first else {
            throw NativeModuleError.invalidPaymentMethods
        }
        
        return paymentMethod
    }
    
    internal func cleanUp() {
        actionHandler?.currentActionComponent?.cancelIfNeeded()
        actionHandler = nil
        currentComponent = nil
        
        currentPresenter?.dismiss(animated: true)
        currentPresenter = nil
    }
    
}

extension BaseModule {
    
    enum NativeModuleError: LocalizedError, KnownError {
        case canceled
        case noClientKey
        case noPayment
        case notSupported
        case invalidPaymentMethods
        case invalidAction
        case paymentMethodNotFound(PaymentMethod.Type)
        
        var errorCode: String {
            switch self {
            case .canceled:
                return "canceledByShopper"
            case .notSupported:
                return "notSupported"
            case .noClientKey:
                return "noClientKey"
            case .noPayment:
                return "noPayment"
            case .invalidPaymentMethods:
                return "invalidPaymentMethods"
            case .invalidAction:
                return "invalidAction"
            case .paymentMethodNotFound(_):
                return "noPaymentMethod"
            }
        }
        
        var errorDescription: String? {
            switch self {
            case .canceled:
                return "Payment canceled by shopper"
            case .notSupported:
                return "Not supported on iOS"
            case .noClientKey:
                return "No clientKey in configuration"
            case .noPayment:
                return "No payment in configuration"
            case .invalidPaymentMethods:
                return "Can not parse paymentMethods or the list is empty"
            case .invalidAction:
                return "Can not parse action"
            case let .paymentMethodNotFound(type):
                return "Can not find payment method of type \(type) in provided list"
            }
        }
    }
    
}


extension BaseModule: PresentationDelegate {
    
    internal func present(component: PresentableComponent) {
        DispatchQueue.main.async { [weak self] in
            self?.present(component)
        }
    }
    
}
