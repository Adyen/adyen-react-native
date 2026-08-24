/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.BillingAddressMode
import com.adyen.checkout.card.FieldVisibility
import com.adyen.checkout.card.InstallmentOptions
import com.adyen.checkout.core.common.CardBrand
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class CardConfigurationParserTest {
  @Test
  fun testConfigurationOnSubDictionary_returnsNullValues_whenEmpty() {
    // GIVEN
    val config = WritableMapMock()
    val cardConfig = WritableMapMock()
    config.putMap(CardConfigurationParser.ROOT_KEY, cardConfig)

    // WHEN
    val sut = CardConfigurationParser(config, countryCode = null)

    // THEN
    assertNull(sut.showStorePaymentField)
    assertNull(sut.holderNameRequired)
    assertNull(sut.showSecurityCode)
    assertNull(sut.showSecurityCodeForStoredCard)
    assertNull(sut.koreanAuthenticationVisibility)
    assertNull(sut.billingAddressMode)
    assertNull(sut.socialSecurityNumberVisibility)
    assertNull(sut.supportedCardBrands)
    assertNull(sut.installmentConfiguration)
  }

  @Test
  fun testBillingAddressMode_returnsPostalCode() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postal")

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(cardParser.billingAddressMode is BillingAddressMode.PostalCode)
  }

  @Test
  fun testBillingAddressMode_returnsNone() {
    // GIVEN
    val config = WritableMapMock()
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "none")

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    assertTrue(cardParser.billingAddressMode is BillingAddressMode.None)
  }

  @Test
  fun testSupportedCardBrands_mapsEachValueToCardBrand() {
    // GIVEN
    val config = WritableMapMock()
    val mockArray = mock(ReadableArray::class.java)
    `when`(mockArray.toArrayList()).thenReturn(
      arrayListOf(
        "mc",
        "visa",
        "maestro",
      ),
    )
    config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, mockArray)

    // WHEN
    val cardParser = CardConfigurationParser(config, "US")

    // THEN
    assertEquals(
      listOf(CardBrand("mc"), CardBrand("visa"), CardBrand("maestro")),
      cardParser.supportedCardBrands,
    )
  }

  @Test
  fun testCardProperties_areParsedCorrectly() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean(CardConfigurationParser.SHOW_STORE_PAYMENT_FIELD_KEY, false)
    config.putBoolean(CardConfigurationParser.HOLDER_NAME_REQUIRED_KEY, true)
    config.putBoolean(CardConfigurationParser.HIDE_CVC_KEY, true)
    config.putBoolean(CardConfigurationParser.HIDE_CVC_STORED_CARD_KEY, true)
    config.putString(CardConfigurationParser.KCP_VISIBILITY_KEY, "show")
    config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postalcode")
    config.putString(CardConfigurationParser.SOCIAL_SECURITY_VISIBILITY_KEY, "show")

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertEquals(false, sut.showStorePaymentField)
    assertEquals(true, sut.holderNameRequired)
    // hideCvc = true maps to showSecurityCode = false
    assertEquals(false, sut.showSecurityCode)
    // hideCvcStoredCard = true maps to showSecurityCodeForStoredCard = false
    assertEquals(false, sut.showSecurityCodeForStoredCard)
    assertEquals(FieldVisibility.SHOW, sut.koreanAuthenticationVisibility)
    assertTrue(sut.billingAddressMode is BillingAddressMode.PostalCode)
    assertEquals(FieldVisibility.SHOW, sut.socialSecurityNumberVisibility)
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
    assertEquals(
      listOf(InstallmentOptions.Plan.REGULAR),
      sut.installmentConfiguration?.defaultOptions?.plans,
    )
    assertEquals(false, sut.installmentConfiguration?.showInstallmentAmount)
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
    assertTrue(
      sut.installmentConfiguration
        ?.defaultOptions
        ?.plans
        ?.contains(InstallmentOptions.Plan.REVOLVING) == true,
    )
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

  @Test
  fun testInstallmentConfiguration_showInstallmentAmount_defaultsToFalse() {
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
    assertEquals(false, sut.installmentConfiguration?.showInstallmentAmount)
  }

  @Test
  fun testInstallmentConfiguration_showInstallmentAmount_canBeSetToTrue() {
    // GIVEN
    val config = WritableMapMock()
    val installmentOptions = WritableMapMock()
    val cardOption = WritableMapMock()
    val valuesArray = mock(ReadableArray::class.java)
    `when`(valuesArray.toArrayList()).thenReturn(arrayListOf(2, 3, 4))
    cardOption.putArray("values", valuesArray)
    installmentOptions.putMap("card", cardOption)
    config.putMap(CardConfigurationParser.INSTALLMENT_OPTIONS_KEY, installmentOptions)
    config.putBoolean(CardConfigurationParser.SHOW_INSTALLMENT_AMOUNT_KEY, true)

    // WHEN
    val sut = CardConfigurationParser(config, "US")

    // THEN
    assertEquals(true, sut.installmentConfiguration?.showInstallmentAmount)
  }
}
