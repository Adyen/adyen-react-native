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

    /// Compatibility accessors for legacy module tests. Storage remains exclusively in
    /// ``CheckoutCoordinator`` and production lifecycle paths no longer use these names.
    @available(*, deprecated, message: "Use CheckoutCoordinator.shared")
    internal static var checkoutState: CheckoutState? {
        get { MainActor.assumeIsolated { CheckoutCoordinator.shared.checkoutState } }
        set { MainActor.assumeIsolated { CheckoutCoordinator.shared.checkoutState = newValue } }
    }

    @available(*, deprecated, message: "Use CheckoutCoordinator.shared")
    internal static var presenterStack: [UIViewController] {
        get { MainActor.assumeIsolated { CheckoutCoordinator.shared.presenterStack } }
        set { MainActor.assumeIsolated { CheckoutCoordinator.shared.presenterStack = newValue } }
    }

    @available(*, deprecated, message: "Use CheckoutCoordinator.shared")
    internal static var currentPresenter: UIViewController? {
        MainActor.assumeIsolated { CheckoutCoordinator.shared.presenterStack.last }
    }

    @available(*, deprecated, message: "Use CheckoutCoordinator.shared")
    internal static var topPresenterProvider: @MainActor () -> UIViewController? {
        get { MainActor.assumeIsolated { CheckoutCoordinator.shared.topPresenterProvider } }
        set { MainActor.assumeIsolated { CheckoutCoordinator.shared.topPresenterProvider = newValue } }
    }

    /// Override for testing. When nil, uses self (RCTEventEmitter).
    internal var emitterOverride: EventEmitter?
    internal var emitter: EventEmitter {
        emitterOverride ?? self
    }

    override func stopObserving() { /* No JS events expected */ }
    override func startObserving() { /* No JS events expected */ }

    @objc
    override func constantsToExport() -> [AnyHashable: Any]! {
        ["supportedEvents": supportedEvents() ?? []]
    }

    internal func sendEvent(event: EventName) {
        emitter.send(event: event, body: [:])
    }

    internal func sendEvent(event: EventName, body: Any?) {
        emitter.send(event: event, body: body)
    }

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
        // TODO: Consider if this should be removed or if it's still needed.
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
        let root = MainActor.assumeIsolated {
            CheckoutCoordinator.shared.checkoutState = nil
            let root = CheckoutCoordinator.shared.presenterStack.first
            CheckoutCoordinator.shared.presenterStack.removeAll()
            return root
        }

        guard root?.presentedViewController != nil else { return }
        root?.dismiss(animated: true)
    }
}

extension BaseModule: PresentationDelegate {

    internal func present(component: PresentableComponent) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            let presenter: UIViewController
            if let currentPresenter = CheckoutCoordinator.shared.presenterStack.last {
                presenter = currentPresenter
            } else if let topPresenter = CheckoutCoordinator.shared.topPresenterProvider() {
                presenter = topPresenter
                CheckoutCoordinator.shared.presenterStack.append(topPresenter)
            } else {
                return self.sendError(error: ModuleException.notKeyWindow)
            }

            let viewController = UINavigationController(rootViewController: component.viewController)
            viewController.presentationController?.delegate = self
            component.viewController.navigationItem.rightBarButtonItem = .init(barButtonSystemItem: .cancel,
                                                                               target: self,
                                                                               action: #selector(self.cancelDidPress))

            presenter.present(viewController, animated: true)
            CheckoutCoordinator.shared.presenterStack.append(viewController)
        }
    }

    @objc private func cancelDidPress() {
        sendError(error: ModuleException.canceled)
    }

}

extension BaseModule: UIAdaptivePresentationControllerDelegate {
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        // Remove the swiped-away VC from the stack
        CheckoutCoordinator.shared.presenterStack.removeAll { $0 === presentationController.presentedViewController }
        cancelDidPress()
    }
}

extension BaseModule: EventEmitter {
    func send(event: EventName, body: Any?) {
        sendEvent(withName: event.rawValue, body: body)
    }
}
