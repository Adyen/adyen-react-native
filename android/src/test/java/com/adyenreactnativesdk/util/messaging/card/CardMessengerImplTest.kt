/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging.card

import com.adyen.checkout.card.BinLookupData
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MockEmitter
import com.google.gson.Gson
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class CardMessengerImplTest {
  private lateinit var mockEmitter: MockEmitter
  private lateinit var gson: Gson
  private lateinit var sut: CardMessengerImpl

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    gson = Gson()
    sut = CardMessengerImpl(mockEmitter, gson)
  }

  @Test
  fun `onBinValue sends event with CHANGE_BIN_VALUE`() {
    // GIVEN
    val binValue = "411111"

    // WHEN
    sut.onBinValue(binValue)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.CHANGE_BIN_VALUE, mockEmitter.events[0].eventName)
    assertEquals(binValue, mockEmitter.events[0].payload)
  }

  @Test
  fun `onBinLookup sends event with BIN_LOOKUP when data is not empty`() {
    // GIVEN
    val binLookupData =
      listOf(
        BinLookupData(brand = "visa", paymentMethodVariant = "visa", isReliable = true),
        BinLookupData(brand = "mc", paymentMethodVariant = "mc", isReliable = true),
      )

    // WHEN
    sut.onBinLookup(binLookupData)

    // THEN
    assertEquals(1, mockEmitter.events.size)
    assertEquals(EventName.BIN_LOOKUP, mockEmitter.events[0].eventName)
    val payload = mockEmitter.events[0].payload as JSONArray
    assertEquals(2, payload.length())
  }

  @Test
  fun `onBinLookup does not send event when data is empty`() {
    // GIVEN
    val binLookupData = emptyList<BinLookupData>()

    // WHEN
    sut.onBinLookup(binLookupData)

    // THEN
    assertEquals(0, mockEmitter.events.size)
  }
}
