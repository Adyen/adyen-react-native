/*
 * Copyright (c) 2024 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.FakeEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class RemoveStoredPaymentMessengerImplTest {
  private lateinit var fakeEmitter: FakeEmitter
  private lateinit var sut: RemoveStoredPaymentMessengerImpl

  @Before
  fun setUp() {
    fakeEmitter = FakeEmitter()
    sut = RemoveStoredPaymentMessengerImpl(fakeEmitter)
  }

  @Test
  fun `onRemove sends event with DISABLE_STORED_PAYMENT_METHOD`() {
    // GIVEN
    val storedPaymentMethod =
      StoredPaymentMethod(
        id = "stored123",
        type = "scheme",
        name = "Visa •••• 1234",
      )

    // WHEN
    sut.onRemove(storedPaymentMethod)

    // THEN
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.DISABLE_STORED_PAYMENT_METHOD, fakeEmitter.events[0].eventName)
    val payload = fakeEmitter.events[0].payload as JSONObject
    assertEquals("stored123", payload.getString("id"))
    assertEquals("scheme", payload.getString("type"))
  }
}
