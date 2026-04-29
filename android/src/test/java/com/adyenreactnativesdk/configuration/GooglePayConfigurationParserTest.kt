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
    verify(mockBuilder, times(0)).allowedAuthMethods = any()
    verify(mockBuilder, times(0)).allowedCardNetworks = any()
    verify(mockBuilder, times(0)).isAllowCreditCards = any()
    verify(mockBuilder, times(0)).isAllowPrepaidCards = any()
    verify(mockBuilder, times(0)).isEmailRequired = any()
    verify(mockBuilder, times(0)).isShippingAddressRequired = any()
    verify(mockBuilder, times(0)).isBillingAddressRequired = any()
    verify(mockBuilder, times(0)).totalPriceStatus = any()
    verify(mockBuilder, times(0)).merchantAccount = any()
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
    verify(mockBuilder, times(1)).isAllowCreditCards = true
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
    verify(mockBuilder, times(1)).isAllowPrepaidCards = true
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
    verify(mockBuilder, times(1)).isEmailRequired = true
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
    verify(mockBuilder, times(1)).isShippingAddressRequired = true
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
    verify(mockBuilder, times(1)).isBillingAddressRequired = true
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
    verify(mockBuilder, times(1)).totalPriceStatus = "FINAL"
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
    verify(mockBuilder, times(1)).merchantAccount = "Merchant_account"
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
    verify(mockBuilder, times(1)).allowedAuthMethods =
      arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS")
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
    verify(mockBuilder, times(1)).allowedCardNetworks =
      arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value")
  }
}
