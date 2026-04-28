/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.AddressConfiguration
import com.adyen.checkout.card.CardBrand
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.card.CardType
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.mockito.kotlin.any

class CardConfigurationParserTest {
  @Test
  fun testConfigurationOnSubDictionary() {
    // GIVEN
    val config = WritableMapMock()
    val cardConfig = WritableMapMock()
    config.putMap(CardConfigurationParser.ROOT_KEY, cardConfig)

    // WHEN
    val sut = CardConfigurationParser(config, countryCode = null)
    val mockBuilder = mock(CardConfiguration.Builder::class.java)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(0)).setShowStorePaymentField(any())
    verify(mockBuilder, times(0)).setHolderNameRequired(any())
    verify(mockBuilder, times(0)).setHideCvc(any())
    verify(mockBuilder, times(0)).setHideCvcStoredCard(any())
    verify(mockBuilder, times(0)).setKcpAuthVisibility(any())
    verify(mockBuilder, times(0)).setAddressConfiguration(any())
    verify(mockBuilder, times(0)).setSocialSecurityNumberVisibility(any())
  }

  @Test
  fun testGetAddressVisibilityFull() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "full")
    val mockArray = mock(ReadableArray::class.java)
    `when`(mockArray.toArrayList()).thenReturn(arrayListOf("US", "GB", "NL"))
    config.putArray(CardConfigurationParser.SUPPORTED_COUNTRY_LIST_KEY, mockArray)

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(cardParser.addressVisibility is AddressConfiguration.FullAddress)
    assertTrue((cardParser.addressVisibility as AddressConfiguration.FullAddress).defaultCountryCode == "US")
    assertTrue(
      (cardParser.addressVisibility as AddressConfiguration.FullAddress).supportedCountryCodes ==
        listOf(
          "US",
          "GB",
          "NL",
        ),
    )
  }

  @Test
  fun testGetAddressVisibilityPostal() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postal")

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(cardParser.addressVisibility is AddressConfiguration.PostalCode)
  }

  @Test
  fun testGetSupportedCardTypes() {
    // GIVEN
    val config = WritableMapMock()
    val mockArray = mock(ReadableArray::class.java)
    `when`(mockArray.toArrayList()).thenReturn(
      arrayListOf(
        "mc",
        "visa",
        "maestro",
        "wrong_value",
      ),
    )
    config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, mockArray)

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    val map =
      cardParser.supportedCardTypes.orEmpty().map { CardType.getByBrandName(it.txVariant) }
    assertEquals(listOf(CardType.MASTERCARD, CardType.VISA, CardType.MAESTRO), map)
  }

  @Test
  fun testApplyConfiguration() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(CardConfigurationParser.SHOW_STORE_PAYMENT_FIELD_KEY, false)
    config.putBoolean(CardConfigurationParser.HOLDER_NAME_REQUIRED_KEY, true)
    config.putBoolean(CardConfigurationParser.HIDE_CVC_KEY, true)
    config.putBoolean(CardConfigurationParser.HIDE_CVC_STORED_CARD_KEY, true)
    config.putString(CardConfigurationParser.KCP_VISIBILITY_KEY, "show")
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postalcode")
    config.putString(CardConfigurationParser.SOCIAL_SECURITY_VISIBILITY_KEY, "show")

    val supportedCardsArray = mock(ReadableArray::class.java)
    `when`(supportedCardsArray.toArrayList()).thenReturn(
      arrayListOf(
        "mc",
        "visa",
        "maestro",
        "wrong_value",
      ),
    )
    config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, supportedCardsArray)

    // WHEN
    val sut = CardConfigurationParser(config, "US")
    val mockBuilder = mock(CardConfiguration.Builder::class.java)
    sut.applyConfiguration(mockBuilder)

    verify(mockBuilder, times(1)).isStorePaymentFieldVisible = false
    verify(mockBuilder, times(1)).isHolderNameRequired = true
    verify(mockBuilder, times(1)).isHideCvc = true
    verify(mockBuilder, times(1)).isHideCvcStoredCard = true
    verify(mockBuilder, times(1)).kcpAuthVisibility = KCPAuthVisibility.SHOW
    verify(mockBuilder, times(1)).addressConfiguration = any()
    verify(mockBuilder, times(1)).socialSecurityNumberVisibility =
      SocialSecurityNumberVisibility.SHOW
    verify(mockBuilder, times(1)).supportedCardBrands =
      listOf(
        CardBrand("mc"),
        CardBrand("visa"),
        CardBrand("maestro"),
      )
  }

  @Test
  fun testInstallmentConfiguration_withDefaultOptions() {
    // GIVEN
    val config = WritableMapMock()
    val installmentOptions = WritableMapMock()
    val cardOption = WritableMapMock()
    val valuesArray = mock(ReadableArray::class.java)
    `when`(valuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4))
    cardOption.putArray("values", valuesArray)
    installmentOptions.putMap("card", cardOption)
    config.putMap(CardConfigurationParser.INSTALLMENT_OPTIONS_KEY, installmentOptions)

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(sut.installmentConfiguration != null)
    assertTrue(sut.installmentConfiguration?.defaultOptions != null)
    assertEquals(listOf(2, 3, 4), sut.installmentConfiguration?.defaultOptions?.values)
    assertEquals(false, sut.installmentConfiguration?.defaultOptions?.includeRevolving)
  }

  @Test
  fun testInstallmentConfiguration_withRevolvingPlan() {
    // GIVEN
    val config = WritableMapMock()
    val installmentOptions = WritableMapMock()
    val cardOption = WritableMapMock()
    val valuesArray = mock(ReadableArray::class.java)
    `when`(valuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4))
    cardOption.putArray("values", valuesArray)
    val plansArray = mock(ReadableArray::class.java)
    `when`(plansArray.toArrayList()).thenReturn(arrayListOf("revolving", "regular"))
    cardOption.putArray("plans", plansArray)
    installmentOptions.putMap("card", cardOption)
    config.putMap(CardConfigurationParser.INSTALLMENT_OPTIONS_KEY, installmentOptions)

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(sut.installmentConfiguration != null)
    assertTrue(sut.installmentConfiguration?.defaultOptions?.includeRevolving == true)
  }

  @Test
  fun testInstallmentConfiguration_withCardBasedOptions() {
    // GIVEN
    val config = WritableMapMock()
    val installmentOptions = WritableMapMock()

    val visaOption = WritableMapMock()
    val visaValuesArray = mock(ReadableArray::class.java)
    `when`(visaValuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4, 5))
    visaOption.putArray("values", visaValuesArray)
    installmentOptions.putMap("visa", visaOption)

    val mcOption = WritableMapMock()
    val mcValuesArray = mock(ReadableArray::class.java)
    `when`(mcValuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4))
    mcOption.putArray("values", mcValuesArray)
    installmentOptions.putMap("mc", mcOption)

    config.putMap(CardConfigurationParser.INSTALLMENT_OPTIONS_KEY, installmentOptions)

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(sut.installmentConfiguration != null)
    assertEquals(2, sut.installmentConfiguration?.cardBasedOptions?.size)
  }

  @Test
  fun testInstallmentConfiguration_withMixedOptions() {
    // GIVEN
    val config = WritableMapMock()
    val installmentOptions = WritableMapMock()

    val cardOption = WritableMapMock()
    val cardValuesArray = mock(ReadableArray::class.java)
    `when`(cardValuesArray.toArrayList()).thenReturn(arrayListOf(2, 3))
    cardOption.putArray("values", cardValuesArray)
    installmentOptions.putMap("card", cardOption)

    val visaOption = WritableMapMock()
    val visaValuesArray = mock(ReadableArray::class.java)
    `when`(visaValuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4, 5))
    visaOption.putArray("values", visaValuesArray)
    val plansArray = mock(ReadableArray::class.java)
    `when`(plansArray.toArrayList()).thenReturn(arrayListOf("revolving"))
    visaOption.putArray("plans", plansArray)
    installmentOptions.putMap("visa", visaOption)

    config.putMap(CardConfigurationParser.INSTALLMENT_OPTIONS_KEY, installmentOptions)

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(sut.installmentConfiguration != null)
    assertTrue(sut.installmentConfiguration?.defaultOptions != null)
    assertEquals(listOf(2, 3), sut.installmentConfiguration?.defaultOptions?.values)
    assertEquals(1, sut.installmentConfiguration?.cardBasedOptions?.size)
  }
}
