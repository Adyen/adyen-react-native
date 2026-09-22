/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DropInConfigurationParserTest {
  @Test
  fun test_returnsNullValues_whenGivenEmptySubDictionary() {
    // GIVEN
    val config = WritableMapMock()
    val dropinConfig = WritableMapMock()
    config.putMap(DropInConfigurationParser.ROOT_KEY, dropinConfig)

    // WHEN
    val sut = DropInConfigurationParser(config)

    // THEN
    assertNull(sut.skipListWhenSinglePaymentMethod)
    assertNull(sut.showPreselectedStoredPaymentMethod)
    assertNull(sut.isRemovingStoredPaymentMethodsEnabled)
  }

  @Test
  fun test_skipListWhenSinglePaymentMethod_returnsCorrectValue_whenExplicitlySetToFalse() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean("skipListWhenSinglePaymentMethod", false)

    // WHEN
    val sut = DropInConfigurationParser(config)

    // THEN
    assertEquals(false, sut.skipListWhenSinglePaymentMethod)
  }

  @Test
  fun test_showPreselectedStoredPaymentMethod_returnsCorrectValue_whenExplicitlySetToFalse() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean("showPreselectedStoredPaymentMethod", false)

    // WHEN
    val sut = DropInConfigurationParser(config)

    // THEN
    assertEquals(false, sut.showPreselectedStoredPaymentMethod)
  }

  @Test
  fun test_showRemovePaymentMethodButton_returnsCorrectValue_whenExplicitlySetToTrue() {
    // GIVEN
    val config = WritableMapMock()
    config.putBoolean("showRemovePaymentMethodButton", true)

    // WHEN
    val sut = DropInConfigurationParser(config)

    // THEN
    assertEquals(true, sut.isRemovingStoredPaymentMethodsEnabled)
  }
}
