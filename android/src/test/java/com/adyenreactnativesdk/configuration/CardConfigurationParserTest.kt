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
        config.putMap(CardConfigurationParser.CARD_KEY, cardConfig)

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
            (cardParser.addressVisibility as AddressConfiguration.FullAddress).supportedCountryCodes == listOf(
                "US",
                "GB",
                "NL"
            )
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
                "wrong_value"
            )
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
                "wrong_value"
            )
        )
        config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, supportedCardsArray)

        // WHEN
        val sut = CardConfigurationParser(config, "US")
        val mockBuilder = mock(CardConfiguration.Builder::class.java)
        sut.applyConfiguration(mockBuilder)

        verify(mockBuilder, times(1)).setShowStorePaymentField(false)
        verify(mockBuilder, times(1)).setHolderNameRequired(true)
        verify(mockBuilder, times(1)).setHideCvc(true)
        verify(mockBuilder, times(1)).setHideCvcStoredCard(true)
        verify(mockBuilder, times(1)).setKcpAuthVisibility(KCPAuthVisibility.SHOW)
        verify(mockBuilder, times(1)).setAddressConfiguration(any())
        verify(mockBuilder, times(1)).setSocialSecurityNumberVisibility(
            SocialSecurityNumberVisibility.SHOW
        )
        verify(mockBuilder, times(1)).setSupportedCardTypes(
            *arrayOf(
                CardBrand("mc"),
                CardBrand("visa"),
                CardBrand("maestro")
            )
        )
    }

}