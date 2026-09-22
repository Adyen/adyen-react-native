/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyenreactnativesdk.util.ResultCodes
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MockEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class SessionMessengerImplTest {
  private lateinit var mockEmitter: MockEmitter
  private lateinit var sut: SessionMessengerImpl

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    sut = SessionMessengerImpl(mockEmitter)
  }

  @Test
  fun `onSessionException sends error with SESSION_ERROR event`() {
    // GIVEN
    val exception = RuntimeException("Test error")

    // WHEN
    sut.onSessionException(exception)

    // THEN
    assertEquals(1, mockEmitter.errors.size)
    assertEquals(EventName.SESSION_ERROR, mockEmitter.errors[0].eventName)
    assertEquals(exception, mockEmitter.errors[0].error)
  }

  @Test
  fun `onFinished sends event with COMPLETE_SESSION`() {
    // GIVEN
    val result =
      SessionCheckoutResult(
        resultCode = CheckoutResultCode("Authorised"),
        sessionId = "session123",
        sessionData = "data",
      )

    // WHEN
    sut.onFinished(result)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.COMPLETE_SESSION, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertEquals("Authorised", payload.getString("resultCode"))
  }

  @Test
  fun `onFinished replaces finish_with_action resultCode with PresentToShopper`() {
    // GIVEN
    val result =
      SessionCheckoutResult(
        resultCode = CheckoutResultCode("finish_with_action"),
        sessionId = "session123",
        sessionData = "data",
      )

    // WHEN
    sut.onFinished(result)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    val payload = mockEmitter.events[0].payload as JSONObject
    assertEquals(ResultCodes.PRESENT_TO_SHOPPER.value, payload.getString("resultCode"))
  }
}
