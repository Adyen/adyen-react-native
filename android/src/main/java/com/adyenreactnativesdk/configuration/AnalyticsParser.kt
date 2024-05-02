package com.adyenreactnativesdk.configuration

import com.adyen.checkout.components.core.AnalyticsConfiguration
import com.adyen.checkout.components.core.AnalyticsLevel
import com.adyen.checkout.core.AdyenLogLevel
import com.adyen.checkout.core.AdyenLogger
import com.facebook.react.bridge.ReadableMap

class AnalyticsParser(config: ReadableMap) {

    companion object {
        const val ANALYTICS_KEY = "analytics"
        const val ANALYTICS_ENABLED_KEY = "enabled"
        const val ANALYTICS_VERBOSE_LOGS = "verboseLogs"
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(ANALYTICS_KEY)) {
            this.config = config.getMap(ANALYTICS_KEY)!!
        } else {
            this.config = config
        }
    }

    private val analyticsEnabled: Boolean
        get() = config.hasKey(ANALYTICS_ENABLED_KEY) && config.getBoolean(
            ANALYTICS_ENABLED_KEY
        )

    internal val verboseLogs: Boolean
        get() = config.hasKey(ANALYTICS_VERBOSE_LOGS) && config.getBoolean(
            ANALYTICS_VERBOSE_LOGS
        )

    val analytics: AnalyticsConfiguration
        get() {
            val logLevel = if (verboseLogs) AdyenLogLevel.VERBOSE else AdyenLogLevel.ERROR
            AdyenLogger.setLogLevel(logLevel)
            return AnalyticsConfiguration(if (analyticsEnabled) AnalyticsLevel.ALL else AnalyticsLevel.NONE)
        }
}