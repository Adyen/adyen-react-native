package com.adyenreactnativesdk.configuration

import com.adyen.checkout.dropin.DropInConfiguration
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

class DropInConfigurationParserTest {
    @Test
    fun applyConfiguration() {
        val mockBuilder = mock(DropInConfiguration.Builder::class.java)
        val config = WritableMapMock()
        config.putBoolean(DropInConfigurationParser.SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY, false)
        config.putBoolean(DropInConfigurationParser.SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY, false)

        // WHEN
        val sut = DropInConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(1)).setSkipListWhenSinglePaymentMethod(false)
        verify(mockBuilder, times(1)).setShowPreselectedStoredPaymentMethod(false)
    }
}