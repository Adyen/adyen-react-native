/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import android.util.Log
import androidx.activity.result.ActivityResultCaller
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.internal.Component
import com.adyenreactnativesdk.component.dropin.DropInModule
import java.lang.ref.WeakReference

/**
 * Umbrella class for setting DropIn and Component specific parameters
 */
object AdyenCheckout {
  private var currentComponent: WeakReference<Component> = WeakReference(null)

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
   * @param intent  received redirect intent
   * @return `true` when intent could be handled by AdyenCheckout
   */
  @JvmStatic
  fun handleIntent(intent: Intent): Boolean {
    if (intent.data == null) {
      return false
    }
    val actionHandlingComponent = currentComponent.get() as? ActionHandlingComponent
    return if (actionHandlingComponent != null) {
      actionHandlingComponent.handleIntent(intent)
      true
    } else {
      Log.e(TAG, "No Action Handling Component registered")
      false
    }
  }

  @JvmStatic
  internal fun setComponent(component: Component) {
    currentComponent = WeakReference(component)
  }

  @JvmStatic
  internal fun removeComponent() {
    currentComponent.clear()
  }

  /**
   * Allow Adyen Components to process intents.
   * @param requestCode  received redirect intent
   * @param resultCode  received redirect intent
   * @param data  received redirect intent
   */
  @JvmStatic
  fun handleActivityResult(
    requestCode: Int,
    resultCode: Int,
    data: Intent?,
  ) {
    // TODO: deprecate
  }

  private const val TAG = "AdyenCheckout"
}
