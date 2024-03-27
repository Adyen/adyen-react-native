/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.card.AddressConfiguration
import com.adyen.checkout.card.CardBrand
import com.adyen.checkout.card.CardType
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class CardConfigurationParserTest {

    @Test
    fun testGetConfiguration() {
        // TODO: add standard configuration tests
    }

    @Test
    fun testGetBcmcConfiguration() {
        // TODO: add bcmc configuration tests
    }

    @Test
    fun testGetShowStorePaymentField() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.SHOW_STORE_PAYMENT_FIELD_KEY, false)

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertFalse(cardParser.showStorePaymentField == true)
    }

    @Test
    fun testGetHolderNameRequired() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.HOLDER_NAME_REQUIRED_KEY, true)

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertTrue(cardParser.holderNameRequired == true)
    }

    @Test
    fun testGetHideCvcStoredCard() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.HIDE_CVC_STORED_CARD_KEY, true)

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertTrue(cardParser.hideCvcStoredCard == true)
    }

    @Test
    fun testGetKcpVisibility() {
        // GIVEN
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.KCP_VISIBILITY_KEY, "show")

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertSame(cardParser.kcpVisibility, KCPAuthVisibility.SHOW)
    }

    @Test
    fun testGetAddressVisibilityPostal() {
        // GIVEN
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postalCode")

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertTrue(cardParser.addressVisibility is AddressConfiguration.PostalCode)
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
        assertTrue((cardParser.addressVisibility as AddressConfiguration.FullAddress).supportedCountryCodes == listOf("US", "GB", "NL"))
    }

    @Test
    fun testGetSupportedCardTypes() {
        // GIVEN
        val mockStatic = Mockito.mockStatic(Log::class.java)
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("mc", "visa", "maestro", "wrong_value"))
        config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, mockArray)

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        val map = cardParser.supportedCardTypes.orEmpty().map { CardType.getByBrandName(it.txVariant) }
        assertEquals(listOf(CardType.MASTERCARD, CardType.VISA, CardType.MAESTRO), map)

        // TEAR DOWN
        mockStatic?.close()
    }

    @Test
    fun testGetSocialSecurityNumberVisibility() {
        // GIVEN
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.SOCIAL_SECURITY_VISIBILITY_KEY, "show")

        // WHEN
        val cardParser = CardConfigurationParser(config, "US")

        // THEN
        assertSame(cardParser.socialSecurityNumberVisibility, SocialSecurityNumberVisibility.SHOW)
    }

}