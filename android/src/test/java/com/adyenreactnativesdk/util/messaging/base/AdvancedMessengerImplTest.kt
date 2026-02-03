/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MockEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

class AdvancedMessengerImplTest {
  private lateinit var mockEmitter: MockEmitter
  private lateinit var sut: AdvancedMessengerImpl

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    sut = AdvancedMessengerImpl(mockEmitter)
  }

  @Test
  fun `onException sends error with ERROR event`() {
    // GIVEN
    val exception = RuntimeException("Test error")

    // WHEN
    sut.onException(exception)

    // THEN
    assertEquals(1, mockEmitter.errors.size)
    assertEquals(EventName.ERROR, mockEmitter.errors[0].eventName)
    assertEquals(exception, mockEmitter.errors[0].error)
  }

  @Test
  fun `onFinished sends event with COMPLETE_VOUCHER`() {
    // WHEN
    sut.onFinished()

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.COMPLETE_VOUCHER, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertEquals("PresentToShopper", payload.getString("resultCode"))
  }

  @Test
  fun `onSubmit sends event with SUBMIT`() {
    // GIVEN
    val paymentComponentData: PaymentComponentData<*> = mock()
    val state: PaymentComponentState<*> = mock()
    whenever(state.data).thenReturn(paymentComponentData)

    // WHEN
    sut.onSubmit(state, returnUrl = "myapp://return")

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.SUBMIT, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertTrue(payload.has("paymentData"))
  }

  @Test
  fun `onSubmit includes returnUrl in payload when provided`() {
    // GIVEN
    val paymentComponentData: PaymentComponentData<*> = mock()
    val state: PaymentComponentState<*> = mock()
    whenever(state.data).thenReturn(paymentComponentData)

    // WHEN
    sut.onSubmit(state, returnUrl = "myapp://return")

    // THEN
    val payload = mockEmitter.events[0].payload as JSONObject
    val paymentData = payload.getJSONObject("paymentData")
    assertEquals("myapp://return", paymentData.getString("returnUrl"))
  }

  @Test
  fun `onAdditionalDetails sends event with ADDITIONAL_DETAILS`() {
    // GIVEN
    val actionComponentData =
      ActionComponentData(
        details = null,
        paymentData = "testPaymentData",
      )

    // WHEN
    sut.onAdditionalDetails(actionComponentData)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.ADDITIONAL_DETAILS, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertEquals("testPaymentData", payload.getString("paymentData"))
  }
}
