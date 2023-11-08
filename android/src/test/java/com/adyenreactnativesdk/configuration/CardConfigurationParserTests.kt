package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.AddressConfiguration
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import com.adyen.checkout.card.data.CardType
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.*
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class CardConfigurationParserTest {

    @Test
    fun testGetConfiguration() {
    }

    @Test
    fun testGetBcmcConfiguration() {
    }

    @Test
    fun testGetShowStorePaymentField() {
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.SHOW_STORE_PAYMENT_FIELD_KEY, false)
        val cardParser = CardConfigurationParser(config, "US")
        assertFalse(cardParser.showStorePaymentField)
    }

    @Test
    fun testGetHolderNameRequired() {
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.HOLDER_NAME_REQUIRED_KEY, true)
        val cardParser = CardConfigurationParser(config, "US")
        assert(cardParser.holderNameRequired)
    }

    @Test
    fun testGetHideCvcStoredCard() {
        val config = WritableMapMock()
        config.putBoolean(CardConfigurationParser.HIDE_CVC_STORED_CARD_KEY, true)
        val cardParser = CardConfigurationParser(config, "US")
        assertTrue(cardParser.hideCvcStoredCard)
    }

    @Test
    fun testGetKcpVisibility() {
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.KCP_VISIBILITY_KEY, "show")
        val cardParser = CardConfigurationParser(config, "US")
        assertSame(cardParser.kcpVisibility, KCPAuthVisibility.SHOW)
    }

    @Test
    fun testGetAddressVisibilityPostal() {
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "postalCode")
        val cardParser = CardConfigurationParser(config, "US")
        assertTrue(cardParser.addressVisibility is AddressConfiguration.PostalCode)
    }

    @Test
    fun testGetAddressVisibilityFull() {
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.ADDRESS_VISIBILITY_KEY, "full")
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("US", "GB", "NL"))
        config.putArray(CardConfigurationParser.SUPPORTED_COUNTRY_LIST_KEY, mockArray)
        val cardParser = CardConfigurationParser(config, "US")
        assertTrue(cardParser.addressVisibility is AddressConfiguration.FullAddress)
        assertTrue((cardParser.addressVisibility as AddressConfiguration.FullAddress).defaultCountryCode == "US")
        assertTrue((cardParser.addressVisibility as AddressConfiguration.FullAddress).supportedCountryCodes == listOf("US", "GB", "NL"))
    }

    @Test
    fun testGetSupportedCardTypes() {
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("mc", "visa", "maestro", "wrong_value"))
        config.putArray(CardConfigurationParser.SUPPORTED_CARD_TYPES_KEY, mockArray)
        val cardParser = CardConfigurationParser(config, "US")
        assertEquals(cardParser.supportedCardTypes, listOf(CardType.MASTERCARD, CardType.VISA, CardType.MAESTRO))
    }

    @Test
    fun testGetSocialSecurityNumberVisibility() {
        val config = WritableMapMock()
        config.putString(CardConfigurationParser.SOCIAL_SECURITY_VISIBILITY_KEY, "show")
        val cardParser = CardConfigurationParser(config, "US")
        assertSame(cardParser.socialSecurityNumberVisibility, SocialSecurityNumberVisibility.SHOW)
    }

}