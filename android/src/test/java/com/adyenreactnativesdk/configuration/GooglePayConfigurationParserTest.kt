/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class GooglePayConfigurationParserTest {
  @Test
  fun test_returnsNullValues_whenGivenEmptySubDictionary() {
    // GIVEN
    val config = WritableMapMock()
    val googleConfig = WritableMapMock()
    config.putMap(GooglePayConfigurationParser.ROOT_KEY, googleConfig)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertNull(sut.allowedAuthMethods)
    assertNull(sut.allowedCardNetworks)
    assertNull(sut.allowCreditCards)
    assertNull(sut.allowPrepaidCards)
    assertNull(sut.emailRequired)
    assertNull(sut.shippingAddressRequired)
    assertNull(sut.billingAddressRequired)
    assertNull(sut.existingPaymentMethodRequired)
    assertNull(sut.totalPriceStatus)
    assertNull(sut.merchantAccount)
  }

  @Test
  fun test_allowCreditCards_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.ALLOW_CREDIT_CARDS_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(true, sut.allowCreditCards)
  }

  @Test
  fun test_allowPrepaidCards_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.ALLOW_PREPAID_CARDS_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(true, sut.allowPrepaidCards)
  }

  @Test
  fun test_emailRequired_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.EMAIL_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(true, sut.emailRequired)
  }

  @Test
  fun test_shippingAddressRequired_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.SHIPPING_ADDRESS_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(true, sut.shippingAddressRequired)
  }

  @Test
  fun test_billingAddressRequired_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.BILLING_ADDRESS_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(true, sut.billingAddressRequired)
  }

  @Test
  fun test_totalPriceStatus_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(GooglePayConfigurationParser.TOTAL_PRICE_STATUS_KEY, "FINAL")

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals("FINAL", sut.totalPriceStatus)
  }

  @Test
  fun test_merchantAccount_returnsCorrectValue_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(GooglePayConfigurationParser.MERCHANT_ACCOUNT_KEY, "Merchant_account")

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals("Merchant_account", sut.merchantAccount)
  }

  @Test
  fun test_allowedAuthMethods_returnsCorrectValues_whenExplicitlySet() {
    // GIVEN
    val config = WritableMapMock()
    val allowedAuthArray = mock(ReadableArray::class.java)
    `when`(allowedAuthArray.toArrayList()).thenReturn(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
    config.putArray(GooglePayConfigurationParser.ALLOWED_AUTH_METHODS_KEY, allowedAuthArray)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(listOf("PAN_ONLY", "CRYPTOGRAM_3DS"), sut.allowedAuthMethods)
  }

  @Test
  fun test_allowedCardNetworks_returnsAllValues_includingUnknownValues() {
    // GIVEN
    val config = WritableMapMock()
    val allowedCardArray = mock(ReadableArray::class.java)
    `when`(allowedCardArray.toArrayList()).thenReturn(
      arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"),
    )
    config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, allowedCardArray)

    // WHEN
    val sut = GooglePayConfigurationParser(config)

    // THEN
    assertEquals(listOf("MASTERCARD", "VISA", "amex", "wrong_value"), sut.allowedCardNetworks)
  }
}
