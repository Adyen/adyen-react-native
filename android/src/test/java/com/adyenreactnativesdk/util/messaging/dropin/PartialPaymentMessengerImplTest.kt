/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.Order
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MockEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class PartialPaymentMessengerImplTest {
  private lateinit var mockEmitter: MockEmitter
  private lateinit var sut: PartialPaymentMessengerImpl

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    sut = PartialPaymentMessengerImpl(mockEmitter)
  }

  @Test
  fun `onOrderRequest sends event with REQUEST_ORDER`() {
    // WHEN
    sut.onOrderRequest()

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.REQUEST_ORDER, mockEmitter.events[0].eventName)
    assertTrue(mockEmitter.events[0].payload is JSONObject)
  }

  @Test
  fun `onOrderCancel sends event with CANCEL_ORDER`() {
    // GIVEN
    val order =
      Order(
        pspReference = "psp123",
        orderData = "orderData",
      )

    // WHEN
    sut.onOrderCancel(order, shouldUpdatePaymentMethods = true)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.CANCEL_ORDER, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertTrue(payload.has("order"))
    assertEquals(true, payload.getBoolean("shouldUpdatePaymentMethods"))
  }
}
