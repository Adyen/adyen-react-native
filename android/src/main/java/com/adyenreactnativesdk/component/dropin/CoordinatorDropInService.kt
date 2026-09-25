/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.dropin.DropInService
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator

/** Routes official Drop-in service callbacks to the active coordinator-owned Drop-in operation. */
internal class CoordinatorDropInService : DropInService() {
  companion object {
    private const val TAG = "CoordinatorDropIn"
  }

  override fun onCreate() {
    super.onCreate()
    Log.i(TAG, "Official v6 Drop-in service created")
  }

  override fun onDestroy() {
    Log.i(TAG, "Official v6 Drop-in service destroyed")
    super.onDestroy()
  }

  override suspend fun onSubmit(data: PaymentComponentData<*>): SubmitResult {
    Log.i(TAG, "Official v6 Drop-in service submit callback")
    return CheckoutCoordinator.shared.onDropInSubmit(data)
  }

  override suspend fun onAdditionalDetails(data: ActionComponentData): AdditionalDetailsResult {
    Log.i(TAG, "Official v6 Drop-in service details callback")
    return CheckoutCoordinator.shared.onDropInAdditionalDetails(data)
  }
}
