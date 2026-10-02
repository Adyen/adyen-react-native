/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

open class KnownException
  @JvmOverloads
  constructor(
    val code: String,
    errorMessage: String,
    cause: Throwable? = null,
  ) : RuntimeException(errorMessage, cause)

sealed class ModuleException(
  code: String,
  message: String,
  cause: Throwable? = null,
) : KnownException(code = code, errorMessage = message, cause) {
  class Canceled :
    ModuleException(
      code = "canceledByShopper",
      message = "Payment canceled by shopper",
    )

  class UnsupportedAddressLookup :
    ModuleException(
      code = "unsupportedCapability",
      message = "Address lookup is unsupported by the pinned Android SDK",
    )

  class NoClientKey :
    ModuleException(
      code = "noClientKey",
      message = "No clientKey in configuration",
    )

  class Unknown(
    reason: String?,
  ) : ModuleException(
      code = "unknown",
      message = reason ?: "Reason unknown",
    )
}
