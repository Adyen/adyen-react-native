/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.error.CheckoutError

internal fun CheckoutError.toModuleException(): Exception =
  if (code == CheckoutError.ErrorCode.CANCELLED) {
    ModuleException.Canceled()
  } else {
    ModuleException.Unknown(message)
  }
