/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.components.core.AnalyticsLevel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AnalyticsParserTest {

    @Test
    fun test_initialization_usesDefaultValues_withEmptyConfiguration() {
        // GIVEN
        val config = WritableMapMock()

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertEquals(AnalyticsLevel.ALL, sut.analytics.level)
        assertFalse(sut.verboseLogs)
    }

    @Test
    fun test_initialization_usesDefaultValues_withEmptySubDictionary() {
        // GIVEN
        val config = WritableMapMock()
        val analyticsConfig = WritableMapMock()
        config.putMap(AnalyticsParser.ROOT_KEY, analyticsConfig)

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertEquals(AnalyticsLevel.ALL, sut.analytics.level)
        assertFalse(sut.verboseLogs)
    }

    @Test
    fun test_analytics_returnsAllLevel_whenEnabledIsTrue() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ENABLED_KEY, true)

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertEquals(AnalyticsLevel.ALL, sut.analytics.level)
    }
    
    @Test
    fun test_analytics_returnsNoneLevel_whenEnabledIsFalse() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ENABLED_KEY, false)

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertEquals(AnalyticsLevel.NONE, sut.analytics.level)
    }

    @Test
    fun test_verboseLogs_returnsTrue_whenExplicitlySetToTrue() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.VERBOSE_LOGS_KEY, true)

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertTrue(sut.verboseLogs)
    }
    
    @Test
    fun test_verboseLogs_returnsFalse_whenExplicitlySetToFalse() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.VERBOSE_LOGS_KEY, false)

        // WHEN
        val sut = AnalyticsParser(config)

        // THEN
        assertFalse(sut.verboseLogs)
    }
}