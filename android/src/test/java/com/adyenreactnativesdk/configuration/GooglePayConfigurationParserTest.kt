/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mockito.kotlin.any

class GooglePayConfigurationParserTest {
  @Test
  fun test_applyConfiguration_doesNotModifyBuilder_whenGivenEmptySubDictionary() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val googleConfig = WritableMapMock()

    config.putMap(GooglePayConfigurationParser.ROOT_KEY, googleConfig)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(0)).setAllowedAuthMethods(any())
    verify(mockBuilder, times(0)).setAllowedCardNetworks(any())
    verify(mockBuilder, times(0)).setAllowCreditCards(any())
    verify(mockBuilder, times(0)).setAllowPrepaidCards(any())
    verify(mockBuilder, times(0)).setEmailRequired(any())
    verify(mockBuilder, times(0)).setShippingAddressRequired(any())
    verify(mockBuilder, times(0)).setBillingAddressRequired(any())
    verify(mockBuilder, times(0)).setTotalPriceStatus(any())
    verify(mockBuilder, times(0)).setMerchantAccount(any())
  }

  @Test
  fun test_allowCreditCards_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.ALLOW_CREDIT_CARDS_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setAllowCreditCards(true)
  }

  @Test
  fun test_allowPrepaidCards_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.ALLOW_PREPAID_CARDS_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setAllowPrepaidCards(true)
  }

  @Test
  fun test_emailRequired_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.EMAIL_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setEmailRequired(true)
  }

  @Test
  fun test_shippingAddressRequired_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.SHIPPING_ADDRESS_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setShippingAddressRequired(true)
  }

  @Test
  fun test_billingAddressRequired_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean(GooglePayConfigurationParser.BILLING_ADDRESS_REQUIRED_KEY, true)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setBillingAddressRequired(true)
  }

  @Test
  fun test_totalPriceStatus_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putString(GooglePayConfigurationParser.TOTAL_PRICE_STATUS_KEY, "FINAL")

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setTotalPriceStatus("FINAL")
  }

  @Test
  fun test_merchantAccount_appliesCorrectValue_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putString(GooglePayConfigurationParser.MERCHANT_ACCOUNT_KEY, "Merchant_account")

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setMerchantAccount("Merchant_account")
  }

  @Test
  fun test_allowedAuthMethods_appliesCorrectValues_whenExplicitlySet() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()

    val allowedAuthArray = mock(ReadableArray::class.java)
    `when`(allowedAuthArray.toArrayList()).thenReturn(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
    config.putArray(GooglePayConfigurationParser.ALLOWED_AUTH_METHODS_KEY, allowedAuthArray)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setAllowedAuthMethods(
      arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"),
    )
  }

  @Test
  fun test_allowedCardNetworks_appliesCorrectValues_includingInvalidValues() {
    // GIVEN
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()

    val allowedCardArray = mock(ReadableArray::class.java)
    `when`(allowedCardArray.toArrayList()).thenReturn(
      arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"),
    )
    config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, allowedCardArray)

    // WHEN
    val sut = GooglePayConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setAllowedCardNetworks(
      arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"),
    )
  }
}
