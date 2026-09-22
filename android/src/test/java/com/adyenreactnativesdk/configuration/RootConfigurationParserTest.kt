/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.core.common.Environment
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class RootConfigurationParserTest {
  @Test
  fun test_initialization_usesDefaultValues_withEmptyConfiguration() {
    // GIVEN
    val map = WritableMapMock()

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.TEST, sut.environment)
    assertNull(sut.amount)
    assertNull(sut.clientKey)
    assertNull(sut.countryCode)
  }

  @Test
  fun test_clientKey_returnsConfiguredValue_whenProvided() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.CLIENT_KEY_KEY, "test_SOMEVALUE")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals("test_SOMEVALUE", sut.clientKey)
  }

  @Test
  fun test_amount_parsesNumericValue_whenConfiguredWithIntegerAmount() {
    // GIVEN
    val map = WritableMapMock()
    val amountmap = WritableMapMock()
    amountmap.putInt("value", 123456)
    amountmap.putString("currency", "USD")
    map.putMap(RootConfigurationParser.AMOUNT_KEY, amountmap)

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertNotNull(sut.amount)
    assertEquals(123456.toLong(), sut.amount?.value)
    assertEquals("USD", sut.amount?.currency)
  }

  @Test
  fun test_amount_returnsNull_whenCurrencyIsMissing() {
    // GIVEN
    val map = WritableMapMock()
    val amountmap = WritableMapMock()
    amountmap.putInt("value", 123456)
    map.putMap(RootConfigurationParser.AMOUNT_KEY, amountmap)

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertNull(sut.amount)
  }

  @Test
  fun test_amount_returnsNull_whenValueIsMissing() {
    // GIVEN
    val map = WritableMapMock()
    val amountmap = WritableMapMock()
    amountmap.putString("currency", "USD")
    map.putMap(RootConfigurationParser.AMOUNT_KEY, amountmap)

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertNull(sut.amount)
  }

  @Test
  fun test_environment_returnsLiveEurope_whenConfiguredWithLive() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "live")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.LIVE_EUROPE, sut.environment)
  }

  @Test
  fun test_environment_returnsLiveUnitedStates_whenConfiguredWithLiveUS() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "live-us")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.LIVE_UNITED_STATES, sut.environment)
  }

  @Test
  fun test_environment_returnsLiveAustralia_whenConfiguredWithLiveAU() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "live-au")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.LIVE_AUSTRALIA, sut.environment)
  }

  @Test
  fun test_environment_returnsLiveNea_whenConfiguredWithLiveNEA() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "live-nea")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.LIVE_NEA, sut.environment)
  }

  @Test
  fun test_environment_returnsTest_whenConfiguredWithInvalidValue() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.ENVIRONMENT_KEY, "beta")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals(Environment.TEST, sut.environment)
  }

  @Test
  fun test_countryCode_returnsConfiguredValue_whenProvided() {
    // GIVEN
    val map = WritableMapMock()
    map.putString(RootConfigurationParser.COUNTRY_CODE_KEY, "US")

    // WHEN
    val sut = RootConfigurationParser(map)

    // THEN
    assertEquals("US", sut.countryCode)
  }
}
