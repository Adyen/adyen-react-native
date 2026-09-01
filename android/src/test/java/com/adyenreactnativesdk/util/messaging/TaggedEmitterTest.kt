/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging

import com.adyenreactnativesdk.component.base.KnownException
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test

class TaggedEmitterTest {
  private lateinit var mockEmitter: MockEmitter
  private lateinit var sut: TaggedEmitter

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    sut = TaggedEmitter.forView(mockEmitter, VIEW_ID)
  }

  // region forView — boxes scalars so JS can demux embedded views

  @Test
  fun `forView sendEvent with JSONObject injects viewId into the payload`() {
    // WHEN
    sut.sendEvent(EventName.SUBMIT, JSONObject().put("paymentData", "abc"))

    // THEN
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals(VIEW_ID, payload.getString("viewId"))
    assertEquals("abc", payload.getString("paymentData"))
  }

  @Test
  fun `forView sendEvent with String wraps the value under the value key`() {
    // WHEN
    sut.sendEvent(EventName.CHANGE_BIN_VALUE, "411111")

    // THEN
    val event = mockEmitter.events.single()
    assertEquals(EventName.CHANGE_BIN_VALUE, event.eventName)
    val payload = event.payload as JSONObject
    assertEquals(VIEW_ID, payload.getString("viewId"))
    assertEquals("411111", payload.getString("value"))
  }

  @Test
  fun `forView sendEvent with JSONArray wraps the array under the data key`() {
    // GIVEN
    val array = JSONArray().put("first")

    // WHEN
    sut.sendEvent(EventName.BIN_LOOKUP, array)

    // THEN
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals(VIEW_ID, payload.getString("viewId"))
    assertEquals("first", payload.getJSONArray("data").getString(0))
  }

  @Test
  fun `forView sendError forwards a tagged event payload instead of an error`() {
    // GIVEN
    val error = KnownException("someCode", "Something went wrong")

    // WHEN
    sut.sendError(EventName.ERROR, error)

    // THEN
    assertEquals(0, mockEmitter.errors.size)
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals(VIEW_ID, payload.getString("viewId"))
    assertEquals("Something went wrong", payload.getString("message"))
    assertEquals("someCode", payload.getString("errorCode"))
    assertFalse(payload.has("reason"))
  }

  @Test
  fun `forView sendError includes the cause as reason when present`() {
    // GIVEN
    val error = KnownException("someCode", "Something went wrong", RuntimeException("Underlying"))

    // WHEN
    sut.sendError(EventName.ERROR, error)

    // THEN
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals("Underlying", payload.getString("reason"))
  }

  // endregion

  // region forSource — tags objects only, so scalar payloads keep their shape

  @Test
  fun `forSource sendEvent with JSONObject injects source into the payload`() {
    // GIVEN
    val sut = TaggedEmitter.forSource(mockEmitter, EventSource.CONTEXT)

    // WHEN
    sut.sendEvent(EventName.SUBMIT, JSONObject().put("paymentData", "abc"))

    // THEN
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals(EventSource.CONTEXT, payload.getString("source"))
    assertEquals("abc", payload.getString("paymentData"))
  }

  @Test
  fun `forSource passes a String through untouched`() {
    // GIVEN a bin value, which JS reads directly rather than unwrapping
    val sut = TaggedEmitter.forSource(mockEmitter, EventSource.DROPIN)

    // WHEN
    sut.sendEvent(EventName.CHANGE_BIN_VALUE, "411111")

    // THEN the payload is still the raw string, not a {source, value} object
    assertEquals("411111", mockEmitter.events.single().payload)
  }

  @Test
  fun `forSource passes a JSONArray through untouched`() {
    // GIVEN an address-lookup style array payload
    val sut = TaggedEmitter.forSource(mockEmitter, EventSource.DROPIN)
    val array = JSONArray().put("first")

    // WHEN
    sut.sendEvent(EventName.BIN_LOOKUP, array)

    // THEN the payload is still the raw array, not a {source, data} object
    val payload = mockEmitter.events.single().payload as JSONArray
    assertEquals("first", payload.getString(0))
  }

  @Test
  fun `forSource sendError tags the error payload with source`() {
    // GIVEN
    val sut = TaggedEmitter.forSource(mockEmitter, EventSource.CONTEXT)

    // WHEN
    sut.sendError(EventName.ERROR, KnownException("someCode", "Something went wrong"))

    // THEN
    val payload = mockEmitter.events.single().payload as JSONObject
    assertEquals(EventSource.CONTEXT, payload.getString("source"))
    assertEquals("someCode", payload.getString("errorCode"))
  }

  // endregion

  private companion object {
    private const val VIEW_ID = "42"
  }
}
