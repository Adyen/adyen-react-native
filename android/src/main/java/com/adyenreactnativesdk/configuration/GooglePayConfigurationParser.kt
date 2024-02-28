/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.Environment
import com.adyen.checkout.googlepay.BillingAddressParameters
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.googlepay.ShippingAddressParameters
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.wallet.WalletConstants
import org.json.JSONException
import java.util.Locale

class GooglePayConfigurationParser(config: ReadableMap) {

    companion object {
        const val TAG = "GooglePayConfigParser"
        const val GOOGLEPAY_KEY = "googlepay"
        const val MERCHANT_ACCOUNT_KEY = "merchantAccount"
        const val ALLOWED_CARD_NETWORKS_KEY = "allowedCardNetworks"
        const val ALLOWED_AUTH_METHODS_KEY = "allowedAuthMethods"
        const val TOTAL_PRICE_STATUS_KEY = "totalPriceStatus"
        const val ALLOW_PREPAID_CARDS_KEY = "allowPrepaidCards"
        const val BILLING_ADDRESS_REQUIRED_KEY = "billingAddressRequired"
        const val EMAIL_REQUIRED_KEY = "emailRequired"
        const val SHIPPING_ADDRESS_REQUIRED_KEY = "shippingAddressRequired"
        const val EXISTING_PAYMENT_METHOD_REQUIRED_KEY = "existingPaymentMethodRequired"
        const val GOOGLEPAY_ENVIRONMENT_KEY = "googlePayEnvironment"
        const val BILLING_ADDRESS_PARAMETERS_KEY = "shippingAddressParameters"
        const val SHIPPING_ADDRESS_PARAMETERS_KEY = "billingAddressParameters"

        const val AMEX = "AMEX"
        const val DISCOVER = "DISCOVER"
        const val INTERAC = "INTERAC"
        const val JCB = "JCB"
        const val MASTERCARD = "MASTERCARD"
        const val VISA = "VISA"

        val availableCardNetworks: Set<String> = setOf(AMEX, DISCOVER, INTERAC, JCB, MASTERCARD, VISA)
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(GOOGLEPAY_KEY)) {
            this.config = config.getMap(GOOGLEPAY_KEY)!!
        } else {
            this.config = config
        }
    }

    val shippingAddressParameters: ShippingAddressParameters?
        get() {
            try {
                val map = config.getMap(SHIPPING_ADDRESS_PARAMETERS_KEY)
                return ShippingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse shippingAddressParameters")
                return null
            }
        }

    val billingAddressParameters: BillingAddressParameters?
        get() {
            try {
                val map = config.getMap(BILLING_ADDRESS_PARAMETERS_KEY)
                return BillingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse billingAddressParameters")
                return null
            }
        }

    val allowedCardNetworks: List<String>
        get() {
            val list: List<Any> =
                config.getArray(ALLOWED_CARD_NETWORKS_KEY)?.toArrayList() ?: emptyList()
            val strings: MutableList<String> = ArrayList(list.size)

            for (cardNetwork in list.map { it.toString().uppercase(Locale.ROOT) }) {
                if (availableCardNetworks.contains(cardNetwork)) {
                    strings.add(cardNetwork)
                } else {
                    Log.w(TAG, "skipping brand $cardNetwork, as it is not an allowed card network.")
                }
            }
            return strings
        }

    val allowedAuthMethods: List<String>
        get() {
            val list: List<Any> =
                config.getArray(ALLOWED_AUTH_METHODS_KEY)?.toArrayList() ?: emptyList()
            val strings: MutableList<String> = ArrayList(list.size)
            for (`object` in list) {
                strings.add(`object`.toString())
            }
            return strings
        }

    fun getGooglePayEnvironment(environment: Environment): Int {
        if (config.hasKey(GOOGLEPAY_ENVIRONMENT_KEY)) {
            return config.getInt(GOOGLEPAY_ENVIRONMENT_KEY)
        }
        return when (environment) {
            Environment.TEST -> WalletConstants.ENVIRONMENT_TEST
            else -> WalletConstants.ENVIRONMENT_PRODUCTION
        }
    }

    fun getConfiguration(builder: GooglePayConfiguration.Builder, environment: Environment): GooglePayConfiguration {
        builder.setGooglePayEnvironment(getGooglePayEnvironment(environment))
        if (config.hasKey(ALLOWED_AUTH_METHODS_KEY)) {
            builder.setAllowedAuthMethods(allowedAuthMethods)
        }
        if (config.hasKey(ALLOWED_CARD_NETWORKS_KEY)) {
            builder.setAllowedCardNetworks(allowedCardNetworks)
        }
        if (config.hasKey(ALLOW_PREPAID_CARDS_KEY)) {
            builder.setAllowPrepaidCards(config.getBoolean(ALLOW_PREPAID_CARDS_KEY))
        }
        if (config.hasKey(BILLING_ADDRESS_REQUIRED_KEY)) {
            builder.setBillingAddressRequired(config.getBoolean(BILLING_ADDRESS_REQUIRED_KEY))
        }
        if (config.hasKey(EMAIL_REQUIRED_KEY)) {
            builder.setEmailRequired(config.getBoolean(EMAIL_REQUIRED_KEY))
        }
        if (config.hasKey(SHIPPING_ADDRESS_REQUIRED_KEY)) {
            builder.setShippingAddressRequired(config.getBoolean(SHIPPING_ADDRESS_REQUIRED_KEY))
        }
        if (config.hasKey(EXISTING_PAYMENT_METHOD_REQUIRED_KEY)) {
            builder.setExistingPaymentMethodRequired(
                config.getBoolean(
                    EXISTING_PAYMENT_METHOD_REQUIRED_KEY
                )
            )
        }
        if (config.hasKey(MERCHANT_ACCOUNT_KEY)) {
            config.getString(MERCHANT_ACCOUNT_KEY)?.let { builder.setMerchantAccount(it) }
        }
        if (config.hasKey(TOTAL_PRICE_STATUS_KEY)) {
            config.getString(TOTAL_PRICE_STATUS_KEY)?.let { builder.setTotalPriceStatus(it) }
        }
        if (config.hasKey(BILLING_ADDRESS_PARAMETERS_KEY)) {
            builder.setBillingAddressParameters(billingAddressParameters)
        }
        if (config.hasKey(SHIPPING_ADDRESS_PARAMETERS_KEY)) {
            builder.setShippingAddressParameters(shippingAddressParameters)
        }

        return builder.build()
    }

}