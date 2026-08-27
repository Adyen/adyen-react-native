//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import React
import UIKit

internal let errorResultCode = CheckoutResultCode.error.rawValue
internal let errorSubmitResult = SubmitResult.completion(resultCode: errorResultCode)
internal let errorAdditionalDetailsResult = AdditionalDetailsResult.completion(resultCode: errorResultCode)

/// Base class for all Adyen React Native modules.
/// - Important: Only one payment flow is supported at a time. Starting a new payment flow
///   while another is in progress will replace the current session and presenter.
internal class BaseModule: RCTEventEmitter {

    /// The pre-created checkout state set by ``ContextModule.setup()`` or ``ContextModule.setupAdvanced()``.
    /// Downstream modules (``ComponentModule``, ``DropInModule``) can reuse this instead of
    /// creating their own checkout inline.
    internal static var checkoutState: CheckoutState?

    private static let sdkVersionLock = NSLock()
    private static var sdkVersionStorage: String?
    internal static var sdkVersion: String? {
        get {
            sdkVersionLock.lock()
            defer { sdkVersionLock.unlock() }
            return sdkVersionStorage
        }
        set {
            sdkVersionLock.lock()
            defer { sdkVersionLock.unlock() }
            sdkVersionStorage = newValue
        }
    }

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
    func completion(_ resultCode: NSString) {
        dismiss(true)
    }

    @objc
    func retry(_ message: NSString) {
        // No-op: subclasses handle retry (e.g. resolving the submit continuation).
        // The checkout context and UI remain alive on retry.
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

    internal func dismiss(_: Bool) {
        ensureMainThread { [weak self] in
            self?.cleanUp()
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
        BaseModule.checkoutState = nil

        let root = BaseModule.presenterStack.first
        BaseModule.presenterStack.removeAll()

        guard root?.presentedViewController != nil else { return }
        root?.dismiss(animated: true)
    }
}

extension BaseModule: PresentationDelegate {

    internal func present(component: PresentableComponent) {
        DispatchQueue.main.async { [weak self] in
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

            let viewController = UINavigationController(rootViewController: component.viewController)
            viewController.presentationController?.delegate = self
            component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                               target: self,
                                                                               action: #selector(self.cancelDidPress))

            presenter.present(viewController, animated: true)
            BaseModule.presenterStack.append(viewController)
        }
    }

    @objc private func cancelDidPress() {
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
