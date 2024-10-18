//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import React
import UIKit

internal class BaseModule: RCTEventEmitter {

    internal static var session: AdyenSession?
    internal var requestOrderHandler: ((Result<PartialPaymentOrder, any Error>) -> Void)?
    internal var checkBalanceHandler: ((Result<Balance, any Error>) -> Void)?

    #if DEBUG
        override func invalidate() {
            super.invalidate()
            dismiss(false)
        }
    #endif

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }
    override open func supportedEvents() -> [String]! { [] }

    internal var currentComponent: Component?
    internal var currentPaymentComponent: PaymentComponent? {
        currentComponent as? PaymentComponent
    }

    internal var currentPresentableComponent: PresentableComponent? {
        currentComponent as? PresentableComponent
    }

    internal static var currentPresenter: UIViewController?
    internal var actionHandler: AdyenActionComponent?

    internal func present(_ component: PresentableComponent) {
        guard let presenter = BaseModule.currentPresenter ?? UIViewController.topPresenter else { return sendEvent(error: NativeModuleError.notKeyWindow) }

        defer {
            BaseModule.currentPresenter = presenter
        }

        guard component.requiresModalPresentation else {
            presenter.present(component.viewController, animated: true)
            return
        }

        let navigation = UINavigationController(rootViewController: component.viewController)
        component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                           target: self,
                                                                           action: #selector(cancelDidPress))
        presenter.present(navigation, animated: true)
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendEvent(error: NativeModuleError.canceled)
    }

    internal func sendEvent(event: Events, body: Any!) {
        sendEvent(withName: event.rawValue, body: body)
    }

    internal func sendEvent(event: Events) {
        sendEvent(withName: event.rawValue, body: [:])
    }

    internal func checkErrorType(_ error: Error) -> Error {
        if error.isComponentCanceled || error.is3DSCanceled {
            return NativeModuleError.canceled
        }
        return error
    }

    internal func sendEvent(error: Swift.Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(withName: Events.didFail.rawValue, body: errorToSend.jsonObject)
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
        BaseModule.session = nil
        SessionHelperModule.sessionListener = nil
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        currentComponent = nil
        requestOrderHandler = nil
        checkBalanceHandler = nil

        BaseModule.currentPresenter?.dismiss(animated: true) {
            BaseModule.currentPresenter = nil
        }
    }

    internal func dismiss(_ result: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            self.currentComponent?.finalizeIfNeeded(with: result) {
                self.cleanUp()
            }
        }
    }
}

extension Error {

    var isComponentCanceled: Bool { (self as? ComponentError) == ComponentError.cancelled }

    var is3DSCanceled: Bool {
        (self as NSError).domain == "com.adyen.Adyen3DS2.ADYRuntimeError" &&
            (self as NSError).code == ADYRuntimeErrorCode.challengeCancelled.rawValue
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
        case notKeyWindow
        case paymentMethodNotFound(PaymentMethod.Type)
        case balanceCheck(message: String)
        case orderRequest(message: String)

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
            case .paymentMethodNotFound:
                return "noPaymentMethod"
            case .notKeyWindow:
                return "notKeyWindow"
            case .balanceCheck(_):
                return "balanceCheck"
            case .orderRequest(_):
                return "orderRequest"
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
            case .notKeyWindow:
                return "Can not find root ViewController"
            case let .balanceCheck(message):
                return "Balance check error: \(message)"
            case let .orderRequest(message):
                return "Order request error: \(message)"
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

extension BaseModule: SessionResultListener {
    func didComplete(with result: Adyen.AdyenSessionResult) {
        sendEvent(event: Events.didComplete, body: result.jsonObject)
    }

    func didFail(with error: Error) {
        sendEvent(error: error)
    }
}

extension BaseModule: PartialPaymentDelegate {

    func checkBalance(with data: PaymentComponentData, component: any Adyen.Component, completion: @escaping (Result<Balance, any Error>) -> Void) {
        sendEvent(event: .didCheckBalance, body: data.jsonObject)
        checkBalanceHandler = completion
    }

    @objc
    public func provideBalance(_ success: NSNumber, balance: NSDictionary?, error: NSDictionary?) {
        guard let checkBalanceHandler else { return }

        DispatchQueue.main.async {
            guard success.boolValue, let balance: Balance = try? balance?.toJson() else {
                let message = error?.value(forKey: "message") as? String ?? "Unknown"
                return checkBalanceHandler(.failure(NativeModuleError.balanceCheck(message: message)))
            }
            checkBalanceHandler(.success(balance))
        }
    }

    func requestOrder(for component: any Adyen.Component, completion: @escaping (Result<PartialPaymentOrder, any Error>) -> Void) {
        sendEvent(event: .didRequestOrder)
        requestOrderHandler = completion
    }

    @objc
    public func provideOrder(_ success: NSNumber, order: NSDictionary?, error: NSDictionary?) {
        guard let requestOrderHandler else {
            return }
        DispatchQueue.main.async {
            guard success.boolValue, let order: PartialPaymentOrder = try? order?.toJson() else {
                let message = error?.value(forKey: "message") as? String ?? "Unknown"
                return requestOrderHandler(.failure(NativeModuleError.orderRequest(message: message)))
            }
            requestOrderHandler(.success(order))
        }
    }

    func cancelOrder(_ order: Adyen.PartialPaymentOrder, component: any Adyen.Component) {
        sendEvent(event: .didCancelOrder, body: order.jsonObject)
    }

}
