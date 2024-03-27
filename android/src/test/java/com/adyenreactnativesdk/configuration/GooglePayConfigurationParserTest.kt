/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.Environment
import com.facebook.react.bridge.ReadableArray
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito.anyString
import org.mockito.Mockito.eq
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.`when`

class GooglePayConfigurationParserTest {

    @Test
    fun getShippingAddressParameters() {
        // TODO: add shipping address configuration tests
    }

    @Test
    fun getBillingAddressParameters() {
        // TODO: add billing address tests
    }

    @Test
    fun getAllowedCardNetworks() {
        // GIVEN
        val mockStatic = mockStatic(Log::class.java)
        val config = WritableMapMock()
        val mockArray = mock(ReadableArray::class.java)
        `when`(mockArray.toArrayList()).thenReturn(arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, mockArray)

        // WHEN
        val googlepayParser = GooglePayConfigurationParser(config)

        // THEN
        assertEquals(googlepayParser.allowedCardNetworks, listOf("MASTERCARD", "VISA", "amex", "wrong_value"))

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
    fun getConfiguration() {
    }
}