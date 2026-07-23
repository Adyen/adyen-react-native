package com.adyenreactnativesdk.configuration

import com.adyen.checkout.components.core.AnalyticsConfiguration
import com.adyen.checkout.components.core.AnalyticsLevel
import com.adyen.checkout.core.AdyenLogLevel
import com.adyen.checkout.core.AdyenLogger
import com.adyenreactnativesdk.component.base.BaseModule
import com.facebook.react.bridge.ReadableMap

class AnalyticsParser(
  config: ReadableMap,
) {
  companion object {
    const val ROOT_KEY = "analytics"
    const val ENABLED_KEY = "enabled"
    const val VERBOSE_LOGS_KEY = "verboseLogs"
  }

  private var config: ReadableMap

  init {
    if (config.hasKey(ROOT_KEY)) {
      this.config = config.getMap(ROOT_KEY)!!
    } else {
      this.config = config
    }
  }

  private val analyticsEnabled: Boolean
    get() = !config.hasKey(ENABLED_KEY) || config.getBoolean(ENABLED_KEY)

  internal val verboseLogs: Boolean
    get() = config.hasKey(VERBOSE_LOGS_KEY) && config.getBoolean(VERBOSE_LOGS_KEY)

  val analytics: AnalyticsConfiguration
    get() {
      val logLevel = if (verboseLogs) AdyenLogLevel.VERBOSE else AdyenLogLevel.ERROR
      AdyenLogger.setLogLevel(logLevel)
      BaseModule.configureAnalytics()
      return AnalyticsConfiguration(if (analyticsEnabled) AnalyticsLevel.ALL else AnalyticsLevel.NONE)
    }
}
