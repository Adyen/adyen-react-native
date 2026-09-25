/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import com.adyenreactnativesdk.component.dropin.CoordinatorDropInLauncher
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator

/**
 * Umbrella class for coordinator-owned Android checkout integration.
 */
object AdyenCheckout {
  /**
   * Registers the official v6 Drop-in result contract with this activity. The active checkout
   * coordinator, rather than this facade, owns the returned launcher and clears its result route.
   */
  @JvmStatic
  fun setLauncherActivity(activity: ActivityResultCaller) {
    CheckoutCoordinator.shared.registerDropInLauncher(CoordinatorDropInLauncher(activity))
  }

  /**
   * Allow Adyen Components to process intents through the coordinator-owned route.
   * @param intent  received redirect intent
   * @return `true` when intent could be handled by AdyenCheckout
   */
  @JvmStatic
  fun handleIntent(intent: Intent): Boolean {
    if (intent.data == null) {
      return false
    }
    return CheckoutCoordinator.shared.handleReturn(intent)
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
