//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout
import UIKit

/// Per-view controller for an embedded `<AdyenComponent>` view. Owns the ``CheckoutPaymentComponent``
/// for a single `viewId`: creates it, hands over its view controller, and disposes of it.
///
/// Doesn't wire the checkout's lifecycle closures itself — ``ContextModule`` does that once at setup,
/// since v6 keeps a single global callback store per checkout.
@MainActor
internal final class ComponentProxy {

    let viewId: String

    private weak var emitter: ContextModule?

    private var paymentComponent: CheckoutPaymentComponent?

    init(viewId: String, emitter: ContextModule?) {
        self.viewId = viewId
        self.emitter = emitter
    }

    // MARK: - Component creation

    /// Builds the payment component for this view within the shared checkout context.
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
