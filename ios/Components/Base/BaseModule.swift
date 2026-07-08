//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import React
import UIKit

/// Base class for all Adyen React Native modules.
/// - Important: Only one payment flow is supported at a time. Starting a new payment flow
///   while another is in progress will replace the current session and presenter.
internal class BaseModule: RCTEventEmitter {

    internal static var session: AdyenSession?
    internal weak static var sessionDelegate: SessionErrorDelegate?
    internal weak static var currentModule: BaseModule?

    /// Stack of view controllers that have presented payment UI.
    /// Appended to on each `present(component:)` call; cleared on cleanup.
    /// Dismissing from the first entry cascades through the whole chain.
    internal static var presenterStack: [UIViewController] = []

    /// The most-recently-added presenter (used when deciding where to present next).
    internal static var currentPresenter: UIViewController? {
        presenterStack.last
    }

    /// Resolves the topmost view controller when the presenter stack is empty.
    /// Defaults to `UIViewController.topPresenter`; override in tests to inject a mock.
    internal static var topPresenterProvider: @MainActor () -> UIViewController? = { UIViewController.topPresenter }

    internal var currentComponent: Component?

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

    @objc
    func hide(_ success: NSNumber, event _: NSDictionary) {
        dismiss(success.boolValue)
    }

    // MARK: - Internal methods

    open func sendError(error _: Error) {
        assertionFailure("Not implemented")
    }

    internal func parsePaymentMethods(from dictionary: NSDictionary) throws -> PaymentMethods {
        guard let paymentMethods: PaymentMethods = try? dictionary.decode()
        else {
            throw ModuleException.invalidPaymentMethods
        }

        return paymentMethods
    }

    internal func parseAction(from dictionary: NSDictionary) throws -> Action {
        guard let data = try? JSONSerialization.data(withJSONObject: dictionary, options: []),
              let action = try? JSONDecoder().decode(Action.self, from: data)
        else {
            throw ModuleException.invalidAction
        }
        return action
    }

    internal func fetchClientKey(from parser: RootConfigurationParser) throws -> String {
        guard let clientKey = parser.clientKey else {
            throw ModuleException.noClientKey
        }
        return clientKey
    }

    internal func fetchPayment(from parser: RootConfigurationParser) throws -> Payment {
        guard let payment = parser.payment else {
            throw ModuleException.noPayment
        }
        return payment
    }

    internal func parsePaymentMethod<T: PaymentMethod>(from dictionary: NSDictionary, for type: T.Type) throws -> T {
        let paymentMethods = try parsePaymentMethods(from: dictionary)

        guard let paymentMethod = paymentMethods.paymentMethod(ofType: type) else {
            throw ModuleException.paymentMethodNotFound(type)
        }

        return paymentMethod
    }

    internal func parseAnyPaymentMethod(from dictionary: NSDictionary) throws -> PaymentMethod {
        let paymentMethods = try parsePaymentMethods(from: dictionary)

        guard let paymentMethod = paymentMethods.regular.first else {
            throw ModuleException.invalidPaymentMethods
        }

        return paymentMethod
    }

    internal func cleanUp() {
        ensureMainThread { [weak self] in
            self?.cleanUpOnMainThread()
        }
    }

    internal func dismiss(_ result: Bool) {
        ensureMainThread { [weak self] in
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
            return ModuleException.canceled
        }
        return error
    }

    private func cleanUpOnMainThread() {
        BaseModule.session = nil
        BaseModule.currentModule = nil
        currentComponent = nil

        let root = BaseModule.presenterStack.first
        BaseModule.presenterStack.removeAll()

        guard root?.presentedViewController != nil else { return }
        root?.dismiss(animated: true)
    }
}

extension BaseModule: PresentationDelegate {

    internal func present(component: PresentableComponent) {
        ensureMainThread { [weak self] in
            guard let self else { return }

            let presenter: UIViewController
            if let currentPresenter = BaseModule.currentPresenter {
                presenter = currentPresenter
            } else if let topPresenter = BaseModule.topPresenterProvider() {
                presenter = topPresenter
                BaseModule.presenterStack.append(topPresenter)
            } else {
                return self.sendError(error: ModuleException.notKeyWindow)
            }

            defer {
                BaseModule.currentModule = self
            }

            let viewController: UIViewController
            if component.requiresModalPresentation {
                viewController = UINavigationController(rootViewController: component.viewController)
                viewController.presentationController?.delegate = self
                component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                                   target: self,
                                                                                   action: #selector(self.cancelDidPress))
            } else {
                viewController = component.viewController
            }

            presenter.present(viewController, animated: true)
            BaseModule.presenterStack.append(viewController)
        }
    }

    @objc private func cancelDidPress() {
        currentComponent?.cancelIfNeeded()
        sendError(error: ModuleException.canceled)
    }

}

extension BaseModule: UIAdaptivePresentationControllerDelegate {
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        // Remove the swiped-away VC from the stack
        BaseModule.presenterStack.removeAll { $0 === presentationController.presentedViewController }
        cancelDidPress()
    }
}
