/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.googlepay.MerchantInfo
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.verifyNoInteractions

class GooglePayConfigurationParserTest {
  @Test
  fun test_merchantInfo_nameOnly() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    info.putString("merchantName", "Example Store")
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)

    GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals("Example Store", captor.firstValue.merchantName)
    assertEquals(null, captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_idOnly() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    info.putString("merchantId", "0123456789")
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)

    GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals(null, captor.firstValue.merchantName)
    assertEquals("0123456789", captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_both() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    info.putString("merchantName", "Example Store")
    info.putString("merchantId", "0123456789")
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)

    GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals("Example Store", captor.firstValue.merchantName)
    assertEquals("0123456789", captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_empty() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)

    GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals(null, captor.firstValue.merchantName)
    assertEquals(null, captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_allNull() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    info.putNull("merchantName")
    info.putNull("merchantId")
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)

    GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals(null, captor.firstValue.merchantName)
    assertEquals(null, captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_nested() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val info = WritableMapMock()
    info.putString("merchantName", "Example Store")
    info.putString("merchantId", "0123456789")
    config.putMap(GooglePayConfigurationParser.MERCHANT_INFO_KEY, info)
    val root = WritableMapMock()
    root.putMap(GooglePayConfigurationParser.ROOT_KEY, config)

    GooglePayConfigurationParser(root).applyConfiguration(mockBuilder)

    val captor = argumentCaptor<MerchantInfo>()
    verify(mockBuilder).merchantInfo = captor.capture()
    assertEquals("Example Store", captor.firstValue.merchantName)
    assertEquals("0123456789", captor.firstValue.merchantId)
  }

  @Test
  fun test_merchantInfo_throws_whenNull() {
    val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putNull(GooglePayConfigurationParser.MERCHANT_INFO_KEY)

    assertThrows(NullPointerException::class.java) {
      GooglePayConfigurationParser(config).applyConfiguration(mockBuilder)
    }
    verifyNoInteractions(mockBuilder)
  }

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
    verifyNoInteractions(mockBuilder)
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
