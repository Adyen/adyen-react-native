/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.dropin.DropInConfiguration
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.kotlin.any

class DropInConfigurationParserTest {
  @Test
  fun test_applyConfiguration_doesNotModifyBuilder_whenGivenEmptySubDictionary() {
    // GIVEN
    val mockBuilder = mock(DropInConfiguration.Builder::class.java)
    val config = WritableMapMock()
    val dropinConfig = WritableMapMock()
    config.putMap(DropInConfigurationParser.ROOT_KEY, dropinConfig)

    // WHEN
    val sut = DropInConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(0)).setSkipListWhenSinglePaymentMethod(any())
    verify(mockBuilder, times(0)).setShowPreselectedStoredPaymentMethod(any())
    verify(mockBuilder, times(0)).setEnableRemovingStoredPaymentMethods(any())
  }

  @Test
  fun test_skipListWhenSinglePaymentMethod_appliesCorrectValue_whenExplicitlySetToFalse() {
    // GIVEN
    val mockBuilder = mock(DropInConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean("skipListWhenSinglePaymentMethod", false)

    // WHEN
    val sut = DropInConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setSkipListWhenSinglePaymentMethod(false)
  }

  @Test
  fun test_showPreselectedStoredPaymentMethod_appliesCorrectValue_whenExplicitlySetToFalse() {
    // GIVEN
    val mockBuilder = mock(DropInConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean("showPreselectedStoredPaymentMethod", false)

    // WHEN
    val sut = DropInConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setShowPreselectedStoredPaymentMethod(false)
  }

  @Test
  fun test_showRemovePaymentMethodButton_appliesCorrectValue_whenExplicitlySetToTrue() {
    // GIVEN
    val mockBuilder = mock(DropInConfiguration.Builder::class.java)
    val config = WritableMapMock()
    config.putBoolean("showRemovePaymentMethodButton", true)

    // WHEN
    val sut = DropInConfigurationParser(config)
    sut.applyConfiguration(mockBuilder)

    // THEN
    verify(mockBuilder, times(1)).setEnableRemovingStoredPaymentMethods(true)
  }
}
