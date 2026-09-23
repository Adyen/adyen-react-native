//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout
import UIKit

/// Per-view controller for one identity-bound Fabric registration. The coordinator owns the
/// registry; this presenter owns only the component created for its checkout/target tuple.
@MainActor
internal final class ComponentProxy: CoordinatorPresenter {

    let checkoutID: String
    let presenterID: String
    private let target: TurboCheckoutTarget
    private var paymentComponent: CheckoutPaymentComponent?

    init(checkoutID: String, presenterID: String, target: TurboCheckoutTarget) {
        self.checkoutID = checkoutID
        self.presenterID = presenterID
        self.target = target
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
    func makeViewController() throws -> UIViewController? {
        guard CheckoutCoordinator.shared.isActive(checkoutID: checkoutID),
              let checkout = CheckoutCoordinator.shared.checkoutState?.checkoutContext else {
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
        paymentComponent = nil
        CheckoutCoordinator.shared.unregisterPassivePresenter(
            checkoutID: checkoutID,
            presenterID: presenterID,
            presenter: self
        )
    }
}
