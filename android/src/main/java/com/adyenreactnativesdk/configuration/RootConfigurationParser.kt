/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.components.core.Amount
import com.facebook.react.bridge.ReadableMap
import com.adyen.checkout.core.Environment
import com.adyenreactnativesdk.util.ReactNativeJson
import java.util.*

class RootConfigurationParser(private val config: ReadableMap) {

    companion object {
        const val TAG = "ConfigurationParser"
        const val AMOUNT_KEY = "amount"
        const val CLIENT_KEY_KEY = "clientKey"
        const val COUNTRY_CODE_KEY = "countryCode"
        const val ENVIRONMENT_KEY = "environment"
        const val SHOPPER_LOCALE_KEY = "shopperLocale"
    }

    val amount: Amount?
        get() {
            if (config.hasKey(AMOUNT_KEY)) {
                val map = config.getMap(AMOUNT_KEY)
                val jsonObject = try {
                    ReactNativeJson.convertMapToJson(map)
                } catch (e: Throwable) {
                    Log.w(TAG, "Amount" + map.toString() + " not valid", e)
                    return null
                }
                return Amount.SERIALIZER.deserialize(jsonObject)
            }
            return null
        }

    val clientKey: String?
        get() = if (config.hasKey(CLIENT_KEY_KEY)) {
            config.getString(CLIENT_KEY_KEY)
        } else null

    val countryCode: String?
        get() = if (config.hasKey(COUNTRY_CODE_KEY)) {
            config.getString(COUNTRY_CODE_KEY)
        } else null

    val locale: Locale?
        get() = if (config.hasKey(SHOPPER_LOCALE_KEY)) {
            Locale.forLanguageTag(config.getString(SHOPPER_LOCALE_KEY)!!)
        } else null

    val environment: Environment
        get() = if (config.hasKey(ENVIRONMENT_KEY)) {
            val environment = config.getString(ENVIRONMENT_KEY)!!
            when (environment.toLowerCase(Locale.ROOT)) {
                "live-au" -> Environment.AUSTRALIA
                "live", "live-eu" -> Environment.EUROPE
                "live-us" -> Environment.UNITED_STATES
                "live-apse" -> Environment.APSE
                "live-in" -> Environment.INDIA
                else -> Environment.TEST
            }
        } else Environment.TEST

}