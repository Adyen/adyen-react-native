/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.instant

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.components.core.paymentmethod.GenericPaymentMethod
import com.adyen.checkout.core.Environment
import com.adyenreactnativesdk.component.base.ComponentData
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

internal interface FakeDelegateComponent :
  Component,
  ActionHandlingComponent

internal class DelegateTestFragment : BaseComponentFragment<FakeDelegateComponent, PaymentComponentState<GenericPaymentMethod>>() {
  override fun setupComponent(componentData: ComponentData<PaymentComponentState<GenericPaymentMethod>>) {
    // Not exercised by these tests.
  }
}

@RunWith(RobolectricTestRunner::class)
class InstantFragmentDelegateTest {
  @Test
  fun `show registers the fragment under the fully qualified class name`() {
    // Kept at CREATED (never started), so the fragment attaches without ever showing its dialog,
    // which would otherwise require a Material theme not set up in this test.
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).create().get()
    val delegate = instantFragmentDelegate { DelegateTestFragment() }

    delegate.show(
      activity.supportFragmentManager,
      CheckoutConfiguration(Environment.TEST, "test_client_key"),
      PaymentMethod(type = "ideal"),
      null,
    )
    activity.supportFragmentManager.executePendingTransactions()

    val byFullyQualifiedName = activity.supportFragmentManager.findFragmentByTag(DelegateTestFragment::class.java.name)
    val bySimpleName = activity.supportFragmentManager.findFragmentByTag(DelegateTestFragment::class.java.simpleName)

    assertNotNull(byFullyQualifiedName)
    assertTrue(byFullyQualifiedName is DelegateTestFragment)
    assertNull(bySimpleName)
  }
}
