/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.adyen.checkout.components.model.payments.Amount
import com.adyen.checkout.core.api.Environment
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
            if (!config.hasKey(AMOUNT_KEY)) {
                Log.w(TAG, "No `amount` on configuration")
                return null
            }
            val map = config.getMap(AMOUNT_KEY)
            val jsonObject = try {
                ReactNativeJson.convertMapToJson(map)
            } catch (e: Throwable) {
                Log.w(TAG, "Amount" + map.toString() + " not valid", e)
                return null
            }

            return Amount.SERIALIZER.deserialize(jsonObject)
        }

    val clientKey: String
        @Throws(NoSuchFieldException::class) get() {
            if (!config.hasKey(CLIENT_KEY_KEY)) {
                throw NoSuchFieldException("No $CLIENT_KEY_KEY")
            }
            return config.getString(CLIENT_KEY_KEY)!!
        }

    val countryCode: String?
        get() = if (config.hasKey(COUNTRY_CODE_KEY)) {
            config.getString(COUNTRY_CODE_KEY)
        } else null

    val locale: Locale?
        get() {
            if (!config.hasKey(SHOPPER_LOCALE_KEY)) {
                return null
            }
            return Locale.forLanguageTag(config.getString(SHOPPER_LOCALE_KEY)!!)
        }

    val environment: Environment
        @Throws(NoSuchFieldException::class) get() {
            if (!config.hasKey(ENVIRONMENT_KEY)) {
                throw NoSuchFieldException("No $ENVIRONMENT_KEY")
            }
            val environment = config.getString(ENVIRONMENT_KEY)!!
            return when (environment.toLowerCase(Locale.ROOT)) {
                "live-au" -> Environment.AUSTRALIA
                "live", "live-eu" -> Environment.EUROPE
                "live-us" -> Environment.UNITED_STATES
                else -> Environment.TEST
            }
        }
}