/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.common.CheckoutContext
import com.facebook.react.bridge.ReadableMap

/**
 * Holds per-checkout shared state.
 * Replaced by a single atomic reference on [BaseModule.Companion] to eliminate
 * inconsistent-state windows that existed when properties were scattered.
 *
 * @property checkoutContext The Adyen SDK checkout context (session or advanced).
 * @property configurationJSON Raw JS configuration kept for DropIn, which still relies
 *           on the v5 `CheckoutConfiguration` builder. Remove once DropIn is migrated to v6.
 */
internal data class CheckoutState(
  val checkoutContext: CheckoutContext,
  val configurationJSON: ReadableMap,
  val sessionBeforeSubmitBridge: SessionBeforeSubmitBridge? = null,
) {
  /** Whether this checkout was created via the session flow. */
  val isSession: Boolean get() = checkoutContext is CheckoutContext.Sessions
}
