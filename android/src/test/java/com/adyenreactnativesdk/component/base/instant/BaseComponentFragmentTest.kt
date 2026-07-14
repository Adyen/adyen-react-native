/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.instant

import android.os.Bundle
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.components.core.paymentmethod.GenericPaymentMethod
import com.adyen.checkout.core.Environment
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyenreactnativesdk.component.base.ComponentData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

private interface FakeComponent :
  Component,
  ActionHandlingComponent

private class TestFragment : BaseComponentFragment<FakeComponent, PaymentComponentState<GenericPaymentMethod>>() {
  val exposedConfiguration get() = configuration
  val exposedPaymentMethod get() = paymentMethod
  val exposedSession get() = session

  override fun setupComponent(componentData: ComponentData<PaymentComponentState<GenericPaymentMethod>>) {
    // Not exercised by these tests.
  }
}

@RunWith(RobolectricTestRunner::class)
class BaseComponentFragmentTest {
  private val configuration = CheckoutConfiguration(Environment.TEST, "test_client_key")
  private val paymentMethod = PaymentMethod(type = "ideal", name = "iDEAL")
  private val session =
    CheckoutSession(
      SessionSetupResponse(
        id = "session_id",
        sessionData = "session_data",
        amount = null,
        expiresAt = "2026-01-01T00:00:00Z",
        paymentMethodsApiResponse = null,
        returnUrl = null,
        configuration = null,
        shopperLocale = null,
      ),
      Order(pspReference = "psp_ref", orderData = "order_data"),
      Environment.TEST,
      "test_client_key",
    )

  @Test
  fun `configuration and paymentMethod round trip through arguments`() {
    val fragment = TestFragment()
    fragment.arguments = BaseComponentFragment.buildArguments(configuration, paymentMethod, null)

    assertEquals(configuration.environment, fragment.exposedConfiguration.environment)
    assertEquals(configuration.clientKey, fragment.exposedConfiguration.clientKey)
    assertEquals(paymentMethod, fragment.exposedPaymentMethod)
  }

  @Test
  fun `session round trips through arguments when provided`() {
    val fragment = TestFragment()
    fragment.arguments = BaseComponentFragment.buildArguments(configuration, paymentMethod, session)

    assertEquals(session, fragment.exposedSession)
  }

  @Test
  fun `session is null when not provided`() {
    val fragment = TestFragment()
    fragment.arguments = BaseComponentFragment.buildArguments(configuration, paymentMethod, null)

    assertNull(fragment.exposedSession)
  }

  @Test
  fun `configuration is cached after first access`() {
    val fragment = TestFragment()
    fragment.arguments = BaseComponentFragment.buildArguments(configuration, paymentMethod, session)

    val config1 = fragment.exposedConfiguration
    val config2 = fragment.exposedConfiguration
    assertSame(config1, config2)

    val session1 = fragment.exposedSession
    val session2 = fragment.exposedSession
    assertSame(session1, session2)
  }

  @Test(expected = IllegalStateException::class)
  fun `configuration throws when missing from arguments`() {
    val fragment = TestFragment()
    fragment.arguments = Bundle()

    fragment.exposedConfiguration
  }

  @Test(expected = IllegalStateException::class)
  fun `paymentMethod throws when missing from arguments`() {
    val fragment = TestFragment()
    fragment.arguments = Bundle()

    fragment.exposedPaymentMethod
  }
}
