/*
 * Copyright (c) 2024 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.util.ResultCodes
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.FakeEmitter
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class SessionMessengerImplTest {
  private lateinit var fakeEmitter: FakeEmitter
  private lateinit var sut: SessionMessengerImpl

  @Before
  fun setUp() {
    fakeEmitter = FakeEmitter()
    sut = SessionMessengerImpl(fakeEmitter)
  }

  @Test
  fun `onSessionException sends error with SESSION_ERROR event`() {
    // GIVEN
    val exception = RuntimeException("Test error")

    // WHEN
    sut.onSessionException(exception)

    // THEN
    assertEquals(1, fakeEmitter.errors.size)
    assertEquals(EventName.SESSION_ERROR, fakeEmitter.errors[0].eventName)
    assertEquals(exception, fakeEmitter.errors[0].error)
  }

  @Test
  fun `onFinished sends event with COMPLETE_SESSION`() {
    // GIVEN
    val result =
      SessionPaymentResult(
        sessionId = "session123",
        sessionData = "data",
        sessionResult = "result",
        resultCode = "Authorised",
        order = null,
      )

    // WHEN
    sut.onFinished(result)

    // THEN
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.COMPLETE_SESSION, fakeEmitter.events[0].eventName)
    val payload = fakeEmitter.events[0].payload as JSONObject
    assertEquals("Authorised", payload.getString("resultCode"))
  }

  @Test
  fun `onFinished replaces finish_with_action resultCode with PresentToShopper`() {
    // GIVEN
    val result =
      SessionPaymentResult(
        sessionId = "session123",
        sessionData = "data",
        sessionResult = "result",
        resultCode = "finish_with_action",
        order = null,
      )

    // WHEN
    sut.onFinished(result)

    // THEN
    assertEquals(1, fakeEmitter.events.size)
    val payload = fakeEmitter.events[0].payload as JSONObject
    assertEquals(ResultCodes.PRESENT_TO_SHOPPER.value, payload.getString("resultCode"))
  }
}
