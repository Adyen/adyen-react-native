/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyenreactnativesdk.component.base.ModuleException
import com.facebook.react.bridge.ReadableMap

object CheckoutConfigurationFactory {
  fun get(json: ReadableMap): CheckoutConfiguration {
    val rootParser = RootConfigurationParser(json)
    val countryCode = rootParser.countryCode
    val analyticsConfiguration = AnalyticsParser(json).analytics

    val clientKey = rootParser.clientKey ?: throw ModuleException.NoClientKey()
    return CheckoutConfiguration(
      environment = rootParser.environment,
      clientKey = clientKey,
      shopperLocale = rootParser.locale,
      amount = rootParser.amount,
      analyticsConfiguration = analyticsConfiguration,
    ) {
      CardConfigurationParser(json, countryCode).applyConfiguration(this)
      GooglePayConfigurationParser(json).applyConfiguration(this, countryCode)
      ThreeDSConfigurationParser(json).applyConfiguration(this)
    }
  }
}
