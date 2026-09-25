/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import androidx.activity.result.ActivityResultCaller
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropInResult
import com.adyenreactnativesdk.coordinator.CoordinatorDropInLauncher
import com.adyenreactnativesdk.coordinator.CoordinatorDropInResult

/**
 * Official v6 Activity Result adapter. The coordinator owns this instance and clears its active
 * callback before operation cleanup, so a late Android result is never routed to replacement work.
 */
internal class CoordinatorDropInLauncher(
  caller: ActivityResultCaller,
) : CoordinatorDropInLauncher {
  private var activeResult: ((CoordinatorDropInResult) -> Unit)? = null
  private val launcher =
    DropIn.registerForResult(caller) { result ->
      activeResult?.invoke(result.toCoordinatorResult())
    }

  override fun start(
    context: CheckoutContext,
    onResult: (CoordinatorDropInResult) -> Unit,
  ) {
    check(activeResult == null) { "Drop-in launcher is already active" }
    activeResult = onResult
    when (context) {
      is CheckoutContext.Sessions -> {
        DropIn.start(launcher, context, CoordinatorDropInService::class.java)
      }

      is CheckoutContext.Advanced -> {
        DropIn.start(launcher, context, CoordinatorDropInService::class.java)
      }

      is CheckoutContext.ActionOnly -> {
        error("Drop-in does not support action-only checkout contexts")
      }
    }
  }

  override fun clearResult() {
    activeResult = null
  }

  private fun DropInResult.toCoordinatorResult(): CoordinatorDropInResult =
    when (this) {
      is DropInResult.Completed -> CoordinatorDropInResult.Completed(resultCode.value)
      is DropInResult.Failed -> CoordinatorDropInResult.Failed(error)
      is DropInResult.Cancelled -> CoordinatorDropInResult.Cancelled
    }
}
