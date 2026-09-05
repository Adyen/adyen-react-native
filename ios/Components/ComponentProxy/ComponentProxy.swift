//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import UIKit

/// Per-view controller for an embedded `<AdyenComponent>` view.
///
/// Owns the ``CheckoutPaymentComponent`` created for a single `viewId` within the shared checkout
/// context, and nothing else: creating the component, handing over its view controller, and
/// disposing of it.
///
/// It deliberately does not touch the checkout's lifecycle closures. v6 keeps one callback store
/// per checkout, so a proxy that wired its own closures would overwrite whichever proxy wired
/// before it. ``ContextModule`` wires them once at setup instead, and because the merchant's
/// callbacks are global rather than per view, nothing here needs to know which view a payment
/// came from.
@MainActor
internal final class ComponentProxy {

    let viewId: String

    /// The single event emitter. Errors raised while building a component have to reach the same
    /// listener as every other event, and ``ComponentModule`` is a separate emitter that nothing
    /// subscribes to.
    private weak var emitter: ContextModule?

    private var paymentComponent: CheckoutPaymentComponent?

    init(viewId: String, emitter: ContextModule?) {
        self.viewId = viewId
        self.emitter = emitter
    }

    // MARK: - Component creation

    /// Builds the payment component for the generic `<AdyenComponent>` view within the shared
    /// checkout context created by ``ContextModule`` at `setup` time.
    @MainActor
    func makeViewController(type: String, configuration _: NSDictionary) async throws -> UIViewController? {
        guard let state = BaseModule.checkoutState else {
            print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
            throw ModuleException.componentNotRegistered(viewId)
        }

        guard let paymentMethodType = PaymentMethodType(rawValue: type) else {
            throw ModuleException.invalidPaymentMethods
        }

        let component = try state.checkoutContext.createPaymentComponent(for: paymentMethodType)
        paymentComponent = component
        return component.viewController
    }

    // MARK: - Error reporting

    func sendError(error: Error) {
        guard let emitter else { return }
        let errorToSend = emitter.checkErrorType(error)
        let event: EventName = BaseModule.checkoutState?.isSession == true ? .failSession : .fail
        emitter.sendEvent(event: event, body: errorToSend.jsonObject)
    }

    // MARK: - Teardown

    func dispose() {
        paymentComponent = nil
    }
}
