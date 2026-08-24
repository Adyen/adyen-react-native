//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import AdyenCheckout

/// Holds per-checkout shared state.
///
/// Replaced scattered static properties on ``BaseModule`` with a single atomic
/// reference to eliminate inconsistent-state windows.
///
/// - ``checkoutContext``: The Adyen SDK checkout object (session or advanced).
struct CheckoutState {
    let checkoutContext: PaymentCheckout

    /// Whether this checkout was created via the session flow.
    var isSession: Bool {
        checkoutContext is SessionCheckout
    }
}
