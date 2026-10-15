//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout
import UIKit

/// The SDK component surface a controller relies on. It is a seam so XCTest can register
/// controllers without building SDK components.
@MainActor
internal protocol PaymentComponentHandle: AnyObject {
    var viewController: UIViewController? { get }
    func submit()
}

extension CheckoutPaymentComponent: PaymentComponentHandle {}

/// A Fabric view currently displaying a controller's component.
@MainActor
internal protocol ControllerViewBinding: AnyObject {
    func controllerDidDispose(_ controller: ComponentProxy)
}

/// Registry-owned controller holding exactly one eagerly created payment component.
///
/// The coordinator is the only owner. Views bind and detach without affecting the component's
/// lifetime; only coordinator teardown disposes it.
@MainActor
internal final class ComponentProxy {

    let checkoutID: String
    let controllerID: String
    let paymentMethodID: String
    let paymentMethod: CatalogPaymentMethod
    let requiresUserInteraction: Bool

    private var component: PaymentComponentHandle?
    /// Read once at creation: several SDK components build a new view controller per access,
    /// and every bound view must embed the instance that `requiresUserInteraction` reported.
    private(set) var viewController: UIViewController?
    private weak var boundView: ControllerViewBinding?
    private(set) var isDisposed = false

    init(
        checkoutID: String,
        controllerID: String,
        paymentMethodID: String,
        paymentMethod: CatalogPaymentMethod,
        component: PaymentComponentHandle
    ) {
        self.checkoutID = checkoutID
        self.controllerID = controllerID
        self.paymentMethodID = paymentMethodID
        self.paymentMethod = paymentMethod
        self.component = component
        let viewController = component.viewController
        self.viewController = viewController
        requiresUserInteraction = viewController != nil
    }

    var isBound: Bool {
        boundView != nil
    }

    // MARK: - View binding

    /// One live view per controller. Binding the view that already holds it is a no-op.
    func bind(_ view: ControllerViewBinding) throws {
        guard !isDisposed else { throw CoordinatorError.staleCheckout }
        if let boundView {
            guard boundView === view else { throw CoordinatorError.controllerAlreadyBound }
            return
        }
        boundView = view
    }

    /// Returns true only when `view` was the bound view, so a stale view cannot release a
    /// newer binding.
    @discardableResult
    func unbind(_ view: ControllerViewBinding) -> Bool {
        guard boundView === view else { return false }
        boundView = nil
        return true
    }

    // MARK: - Submission

    func submit() {
        component?.submit()
    }

    // MARK: - Teardown

    func dispose() {
        guard !isDisposed else { return }
        isDisposed = true
        let view = boundView
        boundView = nil
        view?.controllerDidDispose(self)
        viewController = nil
        component = nil
    }
}
