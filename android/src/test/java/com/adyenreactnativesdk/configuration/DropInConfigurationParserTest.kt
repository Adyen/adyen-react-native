package com.adyenreactnativesdk.configuration

import com.adyen.checkout.dropin.DropInConfiguration
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.kotlin.any

class DropInConfigurationParserTest {

    @Test
    fun testConfigurationOnSubDictionary() {
        // GIVEN
        val mockBuilder = mock(DropInConfiguration.Builder::class.java)
        val config = WritableMapMock()
        val dropinConfig = WritableMapMock()
        config.putMap(DropInConfigurationParser.DROPIN_KEY, dropinConfig)

        // WHEN
        val sut = DropInConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(0)).setSkipListWhenSinglePaymentMethod(any())
        verify(mockBuilder, times(0)).setShowPreselectedStoredPaymentMethod(any())
    }

    @Test
    fun applyConfiguration() {
        // GIVEN
        val mockBuilder = mock(DropInConfiguration.Builder::class.java)
        val config = WritableMapMock()
        config.putBoolean("skipListWhenSinglePaymentMethod", false)
        config.putBoolean("showPreselectedStoredPaymentMethod", false)
        config.putBoolean("showRemovePaymentMethodButton", true)

        // WHEN
        val sut = DropInConfigurationParser(config)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(1)).setSkipListWhenSinglePaymentMethod(false)
        verify(mockBuilder, times(1)).setShowPreselectedStoredPaymentMethod(false)
        verify(mockBuilder, times(1)).setEnableRemovingStoredPaymentMethods(true)
    }
}