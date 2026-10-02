//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout
import UIKit

/// Internal Fabric-only component creation seam. It is supplied by the native view proxy and
/// exists solely to make asynchronous replacement races deterministic in XCTest.
@MainActor
internal protocol FabricComponentFactory: AnyObject {
    func makeViewController(for target: TurboCheckoutTarget) async throws -> UIViewController?
}

/// Per-view controller for one identity-bound Fabric registration. The coordinator owns the
/// registry; this presenter owns only the component created for its checkout/target tuple.
@MainActor
internal final class ComponentProxy: CoordinatorPresenter {

    let checkoutID: String
    let presenterID: String
    private let target: TurboCheckoutTarget
    private let onDispose: @MainActor (ComponentProxy) -> Void
    private let coordinator: CheckoutCoordinator
    private let componentFactory: FabricComponentFactory?
    private var paymentComponent: CheckoutPaymentComponent?
    private var isDisposed = false

    init(
        checkoutID: String,
        presenterID: String,
        target: TurboCheckoutTarget,
        onDispose: @escaping @MainActor (ComponentProxy) -> Void = { _ in },
        coordinator: CheckoutCoordinator = .shared,
        componentFactory: FabricComponentFactory? = nil
    ) {
        self.checkoutID = checkoutID
        self.presenterID = presenterID
        self.target = target
        self.onDispose = onDispose
        self.coordinator = coordinator
        self.componentFactory = componentFactory
    }

    func matches(
        checkoutID: String,
        presenterID: String,
        target: TurboCheckoutTarget
    ) -> Bool {
        self.checkoutID == checkoutID && self.presenterID == presenterID && self.target == target
    }

    // MARK: - Component creation

    /// Builds the payment component only while this exact checkout registration remains active.
    func makeViewController() async throws -> UIViewController? {
        guard coordinator.isActive(checkoutID: checkoutID) else {
            throw CoordinatorError.staleCheckout
        }
        if let componentFactory {
            return try await componentFactory.makeViewController(for: target)
        }
        guard let checkout = coordinator.checkoutState?.checkoutContext else {
            throw CoordinatorError.staleCheckout
        }

        let component: CheckoutPaymentComponent
        switch target {
        case let .paymentMethod(type):
            component = try checkout.createPaymentComponent(for: type)
        case let .storedPaymentMethod(id):
            component = try checkout.createPaymentComponent(for: id)
        }
        paymentComponent = component
        return component.viewController
    }

    // MARK: - Teardown

    func dispose() {
        guard !isDisposed else { return }
        isDisposed = true
        paymentComponent = nil
        onDispose(self)
        coordinator.unregisterPassivePresenter(
            checkoutID: checkoutID,
            presenterID: presenterID,
            presenter: self
        )
    }
}
