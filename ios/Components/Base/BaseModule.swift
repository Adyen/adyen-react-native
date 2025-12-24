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

    internal var lookupHandler: (([LookupAddressModel]) -> Void)?
    internal var lookupCompliationHandler: ((Result<PostalAddress, any Error>) -> Void)?
    internal static var session: AdyenSession?
    internal weak static var activeModule: BaseModule?

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
            BaseModule.activeModule = self
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

    // MARK: - Event Emission Helpers

    internal func checkErrorType(_ error: Error) -> Error {
        if error.isComponentCanceled || error.is3DSCanceled {
            return NativeModuleError.canceled
        }
        return error
    }

    internal func sendEvent(error: Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(withName: Events.didFail.rawValue, body: errorToSend.jsonObject)
    }

    internal func sendSessionEvent(error: Error) {
        let errorToSend = checkErrorType(error)
        sendEvent(withName: Events.didFailSession.rawValue, body: errorToSend.jsonObject)
    }

    internal func sendEvent(event: Events, body: Any!) {
        sendEvent(withName: event.rawValue, body: body)
    }

    // MARK: - Parsers

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
            throw NativeModuleError.paymentMethodNotFound(String(describing: type))
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
        BaseModule.activeModule = nil
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        currentComponent = nil
        lookupHandler = nil
        lookupCompliationHandler = nil

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

            // If this module has a component, use it; otherwise delegate to the active module
            if let component = self.currentComponent {
                component.finalizeIfNeeded(with: result) {
                    self.cleanUp()
                }
            } else if let activeModule = BaseModule.activeModule, activeModule !== self {
                activeModule.dismiss(result)
            } else {
                self.cleanUp()
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

extension BaseModule {

    enum Keys {
        static let sessionId = "sessionId"
        static let sessionData = "sessionData"
        static let order = "order"
        static let message = "message"
        static let brand = "brand"
    }
}
