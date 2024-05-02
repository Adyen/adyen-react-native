package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.kotlin.any

class ThreeDSConfigurationParserTest {

    @Test
    fun applyConfigurationOnSubDictionary() {
        // GIVEN
        val mockBuilder = mock(Adyen3DS2Configuration.Builder::class.java)
        val config = WritableMapMock()
        val threedsConfig = WritableMapMock()
        config.putMap(ThreeDSConfigurationParser.THREEDS2_KEY, threedsConfig)

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(0)).setThreeDSRequestorAppURL(any())

    }

    @Test
    fun testApplyThreeDSConfiguration() {
        // GIVEN
        val mockBuilder = mock(Adyen3DS2Configuration.Builder::class.java)
        val config = WritableMapMock()
        config.putString(ThreeDSConfigurationParser.THREEDS2_REQUESTOR_APP_URL_KEY , "https://testing.com")

        // WHEN
        val sut = ThreeDSConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(1)).setThreeDSRequestorAppURL("https://testing.com")
    }
}