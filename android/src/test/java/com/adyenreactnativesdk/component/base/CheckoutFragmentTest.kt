/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.components.CheckoutController
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutFragmentTest {
  @Test
  fun `hide commits and dismisses a queued fragment before settling`() {
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    var dismissals = 0

    CheckoutFragment.show(
      fragmentManager = activity.supportFragmentManager,
      tag = "queued-action",
      controllerProvider = { mock<CheckoutController>() },
      onCancelled = null,
    )
    CheckoutFragment.hide(
      fragmentManager = activity.supportFragmentManager,
      tag = "queued-action",
      onDismissed = { dismissals += 1 },
    )
    activity.supportFragmentManager.executePendingTransactions()

    assertEquals(1, dismissals)
    assertEquals(null, activity.supportFragmentManager.findFragmentByTag("queued-action"))
  }
}
