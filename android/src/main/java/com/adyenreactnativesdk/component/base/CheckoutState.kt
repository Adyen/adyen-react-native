/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.common.CheckoutContext
import com.facebook.react.bridge.ReadableMap

/**
 * Holds per-checkout shared state as a single atomic reference on [BaseModule.Companion].
 */
internal data class CheckoutState(
  val checkoutContext: CheckoutContext,
  val sessionBeforeSubmitBridge: SessionBeforeSubmitBridge? = null,
) {
  /** Whether this checkout was created via the session flow. */
  val isSession: Boolean get() = checkoutContext is CheckoutContext.Sessions
}
