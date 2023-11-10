package com.adyenreactnativesdk.configuration

import com.adyen.checkout.core.api.Environment
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`
import org.mockito.Mockito.anyString
import org.mockito.Mockito.eq
import android.util.Log

class GooglePayConfigurationParserTest {

    @Test
    fun getShippingAddressParameters() {
    }

    @Test
    fun getBillingAddressParameters() {
    }

    @Test
    fun getAllowedCardNetworks() {
        mockStatic(Log::class.java)
        var wrong_cards_count = 0
        `when`(Log.w(eq("GooglePayConfigParser"), anyString())).thenReturn(wrong_cards_count++)
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("MASTERCARD", "visa", "Amex", "wrong_value"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, mockArray)
        val googlepayParser = GooglePayConfigurationParser(config)
        assertEquals(googlepayParser.allowedCardNetworks, listOf("MASTERCARD", "VISA", "AMEX"))
        assertEquals(wrong_cards_count, 1)
    }

    @Test
    fun getAllowedAuthMethods() {
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_AUTH_METHODS_KEY, mockArray)
        val googlepayParser = GooglePayConfigurationParser(config)
        assertEquals(googlepayParser.allowedAuthMethods, listOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
    }

    @Test
    fun getGooglePayEnvironment() {
        val config = WritableMapMock()
        config.putInt(GooglePayConfigurationParser.GOOGLEPAY_ENVIRONMENT_KEY, 1)
        val googlepayParser = GooglePayConfigurationParser(config)
        assertEquals(googlepayParser.getGooglePayEnvironment(Environment.TEST), 1 )
    }

    @Test
    fun getGooglePayNoEnvironment() {
        val config = WritableMapMock()
        val googlepayParser = GooglePayConfigurationParser(config)
        assertEquals(googlepayParser.getGooglePayEnvironment(Environment.TEST), 3)
    }

    @Test
    fun getConfiguration() {
    }
}