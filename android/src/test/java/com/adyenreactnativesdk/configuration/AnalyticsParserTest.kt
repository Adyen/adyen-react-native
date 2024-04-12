package com.adyenreactnativesdk.configuration

import com.adyen.checkout.components.core.AnalyticsLevel
import org.junit.Assert
import org.junit.Test

class AnalyticsParserTest {

    @Test
    fun testIsEnabled() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ANALYTICS_ENABLED_KEY, true)

        // WHEN
        val analyticsParser = AnalyticsParser(config)

        // THEN
        Assert.assertSame(
            analyticsParser.analytics.level,
            AnalyticsLevel.ALL
        )
    }

    @Test
    fun testIsNotEnabled() {
        // GIVEN
        val config = WritableMapMock()
        config.putBoolean(AnalyticsParser.ANALYTICS_ENABLED_KEY, false)

        // WHEN
        val analyticsParser = AnalyticsParser(config)

        // THEN
        Assert.assertSame(
            analyticsParser.analytics.level,
            AnalyticsLevel.NONE
        )
    }

}