//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout

/// Holds per-checkout shared state as a single atomic reference, replacing scattered static properties on ``BaseModule``.
struct CheckoutState {
    let checkoutContext: PaymentCheckout

    /// Whether this checkout was created via the session flow.
    var isSession: Bool {
        checkoutContext is SessionCheckout
    }
}
