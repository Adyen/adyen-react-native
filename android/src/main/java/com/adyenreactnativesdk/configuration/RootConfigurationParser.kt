/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.common.Environment
import com.adyen.checkout.core.components.data.model.Amount
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

class RootConfigurationParser(
  private val config: ReadableMap,
) {
  companion object {
    const val TAG = "ConfigurationParser"
    const val AMOUNT_KEY = "amount"
    const val CLIENT_KEY_KEY = "clientKey"
    const val COUNTRY_CODE_KEY = "countryCode"
    const val ENVIRONMENT_KEY = "environment"
    const val LOCALE_KEY = "locale"
  }

  val amount: Amount?
    get() {
      if (config.hasKey(AMOUNT_KEY)) {
        val map = config.getMap(AMOUNT_KEY)
        // Deserialization must stay inside the try: Amount.SERIALIZER throws when `currency`
        // or `value` is missing, and an incomplete amount should degrade to null rather than
        // propagate out of configuration parsing.
        return try {
          Amount.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
        } catch (e: Throwable) {
          Log.w(TAG, "Amount" + map.toString() + " not valid", e)
          null
        }
      }
      return null
    }

  val clientKey: String?
    get() =
      if (config.hasKey(CLIENT_KEY_KEY)) {
        config.getString(CLIENT_KEY_KEY)
      } else {
        null
      }

  val countryCode: String?
    get() =
      if (config.hasKey(COUNTRY_CODE_KEY)) {
        config.getString(COUNTRY_CODE_KEY)
      } else {
        null
      }

  val locale: Locale?
    get() =
      if (config.hasKey(LOCALE_KEY)) {
        Locale.forLanguageTag(config.getString(LOCALE_KEY)!!)
      } else {
        null
      }

  val environment: Environment
    get() =
      if (config.hasKey(ENVIRONMENT_KEY)) {
        val environment = config.getString(ENVIRONMENT_KEY)!!
        when (environment.lowercase(Locale.ROOT)) {
          "live-au" -> Environment.LIVE_AUSTRALIA
          "live", "live-eu" -> Environment.LIVE_EUROPE
          "live-us" -> Environment.LIVE_UNITED_STATES
          "live-apse" -> Environment.LIVE_APSE
          "live-in" -> Environment.LIVE_INDIA
          "live-nea" -> Environment.LIVE_NEA
          else -> Environment.TEST
        }
      } else {
        Environment.TEST
      }
}
