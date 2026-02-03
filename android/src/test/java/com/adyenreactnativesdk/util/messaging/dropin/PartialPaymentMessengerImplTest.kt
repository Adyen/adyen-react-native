/*
 * Copyright (c) 2024 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.Order
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.FakeEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class PartialPaymentMessengerImplTest {
  private lateinit var fakeEmitter: FakeEmitter
  private lateinit var sut: PartialPaymentMessengerImpl

  @Before
  fun setUp() {
    fakeEmitter = FakeEmitter()
    sut = PartialPaymentMessengerImpl(fakeEmitter)
  }

  @Test
  fun `onOrderRequest sends event with REQUEST_ORDER`() {
    // WHEN
    sut.onOrderRequest()

    // THEN
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.REQUEST_ORDER, fakeEmitter.events[0].eventName)
    assertTrue(fakeEmitter.events[0].payload is JSONObject)
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
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.CANCEL_ORDER, fakeEmitter.events[0].eventName)
    val payload = fakeEmitter.events[0].payload as JSONObject
    assertTrue(payload.has("order"))
    assertEquals(true, payload.getBoolean("shouldUpdatePaymentMethods"))
  }
}
