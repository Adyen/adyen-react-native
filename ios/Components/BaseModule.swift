//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import AdyenNetworking
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
        guard let presenter = BaseModule.currentPresenter ?? UIViewController.topPresenter else {
            return sendEvent(error: NativeModuleError.notKeyWindow)
        }

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

    internal func sendEvent(error: Error) {
        let errorToSend = NativeModuleError.checkErrorType(error)
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

        guard BaseModule.currentPresenter?.presentedViewController != nil else {
            BaseModule.currentPresenter = nil
            return
        }
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

    enum Keys {
        static let sessionId = "sessionId"
        static let sessionData = "sessionData"
        static let order = "order"
        static let message = "message"
        static let brand = "brand"
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
        var result = result.jsonObject
        result[Keys.sessionId] = Self.session?.sessionContext.identifier
        result[Keys.sessionData] = Self.session?.sessionContext.data
        result[Keys.order] = self.currentPaymentComponent?.order?.jsonObject

        sendEvent(event: Events.didComplete, body: result)
    }

    func didFail(with error: Error) {
        sendEvent(error: error)
    }
}
