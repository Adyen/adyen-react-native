/*
 * Copyright (c) 2024 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.address

import com.adyen.checkout.components.core.LookupAddress
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.FakeEmitter
import com.google.gson.Gson
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AddressLookupMessengerImplTest {
  private lateinit var fakeEmitter: FakeEmitter
  private lateinit var gson: Gson
  private lateinit var sut: AddressLookupMessengerImpl

  @Before
  fun setUp() {
    fakeEmitter = FakeEmitter()
    gson = Gson()
    sut = AddressLookupMessengerImpl(fakeEmitter, gson)
  }

  @Test
  fun `onQueryChanged sends event with UPDATE_ADDRESS`() {
    // GIVEN
    val query = "123 Main St"

    // WHEN
    sut.onQueryChanged(query)

    // THEN
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.UPDATE_ADDRESS, fakeEmitter.events[0].eventName)
    assertEquals(query, fakeEmitter.events[0].payload)
  }

  @Test
  fun `onLookupCompletion sends event with CONFIRM_ADDRESS and returns true`() {
    // GIVEN
    val lookupAddress =
      LookupAddress(
        id = "addr123",
        address =
          com.adyen.checkout.components.core.AddressData(
            street = "Main St",
            houseNumberOrName = "123",
            city = "Amsterdam",
            postalCode = "1012AB",
            country = "NL",
            stateOrProvince = "",
            apartmentSuite = "",
          ),
      )

    // WHEN
    val result = sut.onLookupCompletion(lookupAddress)

    // THEN
    assertTrue(result)
    assertEquals(1, fakeEmitter.events.size)
    assertEquals(EventName.CONFIRM_ADDRESS, fakeEmitter.events[0].eventName)
    val payload = fakeEmitter.events[0].payload as JSONObject
    assertEquals("addr123", payload.getString("id"))
  }
}
