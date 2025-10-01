/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertFalse
import org.junit.Test

class PartialPaymentParserTest {

    @Test
    fun test_initialization_defaultsToPinRequired_withEmptyConfiguration() {
        // GIVEN
        val config = WritableMapMock()
        
        // WHEN
        val sut = PartialPaymentParser(config)
        
        // THEN
        assertTrue(sut.pinRequired)
    }
    
    @Test
    fun test_initialization_defaultsToPinRequired_withEmptySubDictionary() {
        // GIVEN
        val config = WritableMapMock()
        val partialPaymentConfiguration = WritableMapMock()
        config.putMap(PartialPaymentParser.ROOT_KEY, partialPaymentConfiguration)

        // WHEN
        val sut = PartialPaymentParser(config)

        // THEN
        assertTrue(sut.pinRequired)
    }

    @Test
    fun test_pinRequired_returnsFalse_whenConfiguredAsFalse() {
        // GIVEN
        val config = WritableMapMock()
        val partialPaymentConfiguration = WritableMapMock()
        partialPaymentConfiguration.putBoolean(PartialPaymentParser.PIN_REQUIRED_KEY, false)
        config.putMap(PartialPaymentParser.ROOT_KEY, partialPaymentConfiguration)

        // WHEN
        val sut = PartialPaymentParser(config)

        // THEN
        assertFalse(sut.pinRequired)
    }

    @Test
    fun test_pinRequired_returnsTrue_whenConfiguredAsTrue() {
        // GIVEN
        val config = WritableMapMock()
        val partialPaymentConfiguration = WritableMapMock()
        partialPaymentConfiguration.putBoolean(PartialPaymentParser.PIN_REQUIRED_KEY, true)
        config.putMap(PartialPaymentParser.ROOT_KEY, partialPaymentConfiguration)

        // WHEN
        val sut = PartialPaymentParser(config)

        // THEN
        assertTrue(sut.pinRequired)
    }
    
    @Test
    fun test_pinRequired_canBeSetDirectly_withoutSubDictionary() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(PartialPaymentParser.PIN_REQUIRED_KEY, false)

        // WHEN
        val sut = PartialPaymentParser(config)

        // THEN
        assertFalse(sut.pinRequired)
    }
}