/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.kotlin.any

class ThreeDSConfigurationParserTest {

    @Test
    fun test_requestorAppUrl_returnsNull_withEmptyConfiguration() {
        // GIVEN
        val config = WritableMapMock()
        
        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        
        // THEN
        assertNull(sut.requestorAppUrl)
    }

    @Test
    fun test_applyConfiguration_doesNotModifyBuilder_whenGivenEmptySubDictionary() {
        // GIVEN
        val mockBuilder = mock(Adyen3DS2Configuration.Builder::class.java)
        val config = WritableMapMock()
        val threedsConfig = WritableMapMock()
        config.putMap(ThreeDSConfigurationParser.ROOT_KEY, threedsConfig)

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(0)).setThreeDSRequestorAppURL(any())
    }
    
    @Test
    fun test_requestorAppUrl_returnsConfiguredValue_whenProvidedInRootDictionary() {
        // GIVEN
        val config = WritableMapMock()
        config.putString(
            ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
            "https://testing.com"
        )

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        
        // THEN
        assertEquals("https://testing.com", sut.requestorAppUrl)
    }

    @Test
    fun test_requestorAppUrl_appliesCorrectValue_whenExplicitlySet() {
        // GIVEN
        val mockBuilder = mock(Adyen3DS2Configuration.Builder::class.java)
        val config = WritableMapMock()
        config.putString(
            ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
            "https://testing.com"
        )

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(1)).setThreeDSRequestorAppURL("https://testing.com")
    }
    
    @Test
    fun test_requestorAppUrl_returnsConfiguredValue_whenProvidedInThreeDSDictionary() {
        // GIVEN
        val config = WritableMapMock()
        val threedsConfig = WritableMapMock()
        threedsConfig.putString(
            ThreeDSConfigurationParser.REQUESTOR_APP_URL_KEY,
            "https://testing.com"
        )
        config.putMap(ThreeDSConfigurationParser.ROOT_KEY, threedsConfig)

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        
        // THEN
        assertEquals("https://testing.com", sut.requestorAppUrl)
    }
}