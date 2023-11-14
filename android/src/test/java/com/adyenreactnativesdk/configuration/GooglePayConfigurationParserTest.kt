package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.api.Environment
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.MockedStatic
import org.mockito.Mockito.anyString
import org.mockito.Mockito.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`


class GooglePayConfigurationParserTest {

    private var mockStatic: MockedStatic<Log>? = null

    @Test
    fun getShippingAddressParameters() {
    }

    @Test
    fun getBillingAddressParameters() {
    }

    @Test
    fun getAllowedCardNetworks() {
        // GIVEN
        mockStatic = mockStatic(Log::class.java)
        var wrong_cards_count = 0
        `when`(Log.w(eq("GooglePayConfigParser"), anyString())).thenReturn(wrong_cards_count++)
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("MASTERCARD", "visa", "Amex", "wrong_value"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, mockArray)

        // WHEN
        val googlepayParser = GooglePayConfigurationParser(config)

        // THEN
        assertEquals(googlepayParser.allowedCardNetworks, listOf("MASTERCARD", "VISA", "AMEX"))
        assertEquals(wrong_cards_count, 1)

        // TEAR DOWN
        mockStatic?.close()
    }

    @Test
    fun getAllowedAuthMethods() {
        // GIVEN
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_AUTH_METHODS_KEY, mockArray)

        // WHEN
        val googlepayParser = GooglePayConfigurationParser(config)

        // THEN
        assertEquals(googlepayParser.allowedAuthMethods, listOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
    }

    @Test
    fun getGooglePayEnvironment() {
        // GIVEN
        val config = WritableMapMock()
        config.putInt(GooglePayConfigurationParser.GOOGLEPAY_ENVIRONMENT_KEY, 1)

        // WHEN
        val googlepayParser = GooglePayConfigurationParser(config)

        // THEN
        assertEquals(googlepayParser.getGooglePayEnvironment(Environment.TEST), 1 )
    }

    @Test
    fun getGooglePayNoEnvironment() {
        // GIVEN
        val config = WritableMapMock()

        // WHEN
        val googlepayParser = GooglePayConfigurationParser(config)

        // THEN
        assertEquals(googlepayParser.getGooglePayEnvironment(Environment.TEST), 3)
    }

    @Test
    fun getConfiguration() {
    }
}