package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.Test
import org.mockito.Mockito.*

class ThreeDSConfigurationParserTest {

    @Test
    fun testApplyThreeDSConfiguration() {
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