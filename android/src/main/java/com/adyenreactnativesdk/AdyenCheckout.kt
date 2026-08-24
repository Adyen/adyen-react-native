/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import com.adyenreactnativesdk.component.dropin.DropInModule

/**
 * Umbrella class for setting DropIn and Component specific parameters
 */
object AdyenCheckout {
  /**
   * Persist a reference to Activity that will present DropIn or Component
   * @param activity  parent activity for DropIn or Component
   */
  @JvmStatic
  fun setLauncherActivity(activity: ActivityResultCaller) {
    DropInModule.register(activity)
  }

  /**
   * Allow Adyen Components to process intents.
   *
   * In v6 redirect/deep-link returns are dispatched to the active [com.adyen.checkout.core.components.CheckoutController]
   * instances tracked by [CheckoutControllerRegistry], which call `CheckoutController.handleReturn(intent)`.
   * @param intent  received redirect intent
   * @return `true` when intent could be handled by AdyenCheckout
   */
  @JvmStatic
  fun handleIntent(intent: Intent): Boolean {
    if (intent.data == null) {
      return false
    }
    return CheckoutControllerRegistry.handleReturn(intent)
  }

  /**
   * Allow Adyen Components to process intents.
   * @param requestCode  received redirect intent
   * @param resultCode  received redirect intent
   * @param data  received redirect intent
   */
  @Deprecated(
    message = "Deprecated. This method is kept for backwards compatibility and no longer has any effect.",
    level = DeprecationLevel.WARNING,
  )
  @JvmStatic
  fun handleActivityResult(
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    // TODO: deprecate
  }
}
