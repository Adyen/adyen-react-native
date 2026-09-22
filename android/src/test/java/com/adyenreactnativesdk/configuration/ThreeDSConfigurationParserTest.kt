/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.core.common.Environment
import com.adyen.checkout.core.components.CheckoutConfiguration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ThreeDSConfigurationParserTest {
  @Test
  fun test_requestorAppUrl_returnsNull_withEmptyConfiguration() {
    // GIVEN
    val config = WritableMapMock()

    // WHEN
    val sut = ThreeDSConfigurationParser(config)

    // THEN
    assertNull(sut.requestorAppUrl)
  }

  @Test
  fun test_applyConfiguration_doesNotThrow_whenGivenEmptySubDictionary() {
    // GIVEN
    val config = WritableMapMock()
    val threedsConfig = WritableMapMock()
    config.putMap(ThreeDSConfigurationParser.ROOT_KEY, threedsConfig)
    val configuration =
      CheckoutConfiguration(
        environment = Environment.TEST,
        clientKey = "test_key",
      )

    // WHEN
    val sut = ThreeDSConfigurationParser(config)
    sut.applyConfiguration(configuration)

    // THEN
    assertNull(sut.requestorAppUrl)
  }

  @Test
  fun test_requestorAppUrl_returnsConfiguredValue_whenProvidedInRootDictionary() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(
      ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
      "https://testing.com",
    )

    // WHEN
    val sut = ThreeDSConfigurationParser(config)

    // THEN
    assertEquals("https://testing.com", sut.requestorAppUrl)
  }

  @Test
  fun test_applyConfiguration_doesNotThrow_whenRequestorAppUrlIsSet() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(
      ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
      "https://testing.com",
    )
    val configuration =
      CheckoutConfiguration(
        environment = Environment.TEST,
        clientKey = "test_key",
      )

    // WHEN
    val sut = ThreeDSConfigurationParser(config)
    sut.applyConfiguration(configuration)

    // THEN
    assertEquals("https://testing.com", sut.requestorAppUrl)
  }

  @Test
  fun test_requestorAppUrl_returnsConfiguredValue_whenProvidedInThreeDSDictionary() {
    // GIVEN
    val config = WritableMapMock()
    val threedsConfig = WritableMapMock()
    threedsConfig.putString(
      ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
      "https://testing.com",
    )
    config.putMap(ThreeDSConfigurationParser.ROOT_KEY, threedsConfig)

    // WHEN
    val sut = ThreeDSConfigurationParser(config)

    // THEN
    assertEquals("https://testing.com", sut.requestorAppUrl)
  }
}
