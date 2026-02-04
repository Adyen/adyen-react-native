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
    internal weak static var sessionDelegate: SessionErrorDelegate?
    internal weak static var currentModule: BaseModule?
    internal static var currentPresenter: UIViewController?

    internal var currentComponent: Component?
    internal var actionHandler: AdyenActionComponent?

    #if DEBUG
        override func invalidate() {
            super.invalidate()
            dismiss(false)
        }
    #endif

    // MARK: - Public methods

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        true
    }

    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }
    override open func supportedEvents() -> [String]! {
        []
    }

    @objc
    override func constantsToExport() -> [AnyHashable: Any]! {
        ["supportedEvents": supportedEvents() ?? []]
    }

    @objc
    func hide(_ success: NSNumber, event: NSDictionary) {
        dismiss(success.boolValue)
    }

    // MARK: - Internal methods

    open func sendError(error: Error) {
        assertionFailure("Not implemented")
    }

    internal func parsePaymentMethods(from dictionary: NSDictionary) throws -> PaymentMethods {
        guard let paymentMethods: PaymentMethods = try? dictionary.decode()
        else {
            throw NativeModuleError.invalidPaymentMethods
        }

        return paymentMethods
    }

    internal func parseAction(from dictionary: NSDictionary) throws -> Action {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
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

    internal func parsePaymentMethod<T: PaymentMethod>(from dictionary: NSDictionary, for type: T.Type) throws -> T {
        let paymentMethods = try parsePaymentMethods(from: dictionary)

        guard let paymentMethod = paymentMethods.paymentMethod(ofType: type) else {
            throw NativeModuleError.paymentMethodNotFound(type)
        }

        return paymentMethod
    }

    internal func parseAnyPaymentMethod(from dictionary: NSDictionary) throws -> PaymentMethod {
        let paymentMethods = try parsePaymentMethods(from: dictionary)

        guard let paymentMethod = paymentMethods.regular.first else {
            throw NativeModuleError.invalidPaymentMethods
        }

        return paymentMethod
    }

    internal func cleanUp() {
        BaseModule.session = nil
        BaseModule.currentModule = nil
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        currentComponent = nil

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
            if let component = self.currentComponent {
                component.finalizeIfNeeded(with: result) {
                    self.cleanUp()
                }
            } else {
                self.cleanUp()
            }
        }
    }

    // MARK: - Event Emission Helpers

    internal func checkErrorType(_ error: Error) -> Error {
        if error.isComponentCanceled || error.is3DSCanceled {
            return NativeModuleError.canceled
        }
        return error
    }
}

extension BaseModule: PresentationDelegate {

    internal func present(component: PresentableComponent) {
        guard let presenter = BaseModule.currentPresenter ?? UIViewController.topPresenter else {
            return sendError(error: NativeModuleError.notKeyWindow)
        }

        defer {
            BaseModule.currentPresenter = presenter
            BaseModule.currentModule = self
        }

        let viewContoller: UIViewController
        if component.requiresModalPresentation {
            viewContoller = UINavigationController(rootViewController: component.viewController)
            component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                           target: self,
                                                                           action: #selector(cancelDidPress))
        } else {
            viewContoller = component.viewController
        }

        return DispatchQueue.main.async {
            presenter.present(viewContoller, animated: true)
        }
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendError(error: NativeModuleError.canceled)
    }

}
