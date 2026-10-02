/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.googlepay

import android.content.Context
import com.adyen.checkout.core.common.Environment

// TODO: COSDK-1310 - Replace with SDK-provided availability check when exposed publicly
internal object GooglePayAvailability {
  @Suppress("UNUSED_PARAMETER")
  suspend fun isAvailable(
    context: Context,
    environment: Environment,
    allowedAuthMethods: List<String>?,
    allowedCardNetworks: List<String>?,
    paymentMethodBrands: List<String>,
  ): Boolean = true
}
