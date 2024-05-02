package com.adyenreactnativesdk.configuration

import com.adyen.checkout.components.core.AnalyticsLevel
import org.junit.Assert
import org.junit.Test

class AnalyticsParserTest {

    @Test
    fun applyConfigurationOnSubDictionary() {
        // GIVEN
        val config = WritableMapMock()
        val analyticsConfig = WritableMapMock()
        config.putMap(AnalyticsParser.ANALYTICS_KEY, analyticsConfig)

        // WHEN
        val analyticsParser = AnalyticsParser(config)

        // THEN
        Assert.assertSame(analyticsParser.analytics.level, AnalyticsLevel.NONE)
        Assert.assertFalse(analyticsParser.verboseLogs)
    }

    @Test
    fun testIsEnabled() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ANALYTICS_ENABLED_KEY, true)
        config.putBoolean(AnalyticsParser.ANALYTICS_VERBOSE_LOGS, false)


        // WHEN
        val analyticsParser = AnalyticsParser(config)

        // THEN
        Assert.assertSame(analyticsParser.analytics.level, AnalyticsLevel.ALL)
        Assert.assertFalse(analyticsParser.verboseLogs)

    }

    @Test
    fun testIsNotEnabled() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ANALYTICS_ENABLED_KEY, false)
        config.putBoolean(AnalyticsParser.ANALYTICS_VERBOSE_LOGS, true)

        // WHEN
        val analyticsParser = AnalyticsParser(config)

        // THEN
        Assert.assertSame(analyticsParser.analytics.level, AnalyticsLevel.NONE)
        Assert.assertTrue(analyticsParser.verboseLogs)

    }

}