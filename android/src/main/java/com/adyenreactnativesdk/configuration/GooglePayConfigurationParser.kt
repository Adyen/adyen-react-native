/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.googlepay.BillingAddressParameters
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.googlepay.ShippingAddressParameters
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class GooglePayConfigurationParser(config: ReadableMap) {

    companion object {
        internal const val TAG = "GooglePayConfigParser"
        internal const val GOOGLEPAY_KEY = "googlepay"
        internal const val MERCHANT_ACCOUNT_KEY = "merchantAccount"
        internal const val ALLOWED_CARD_NETWORKS_KEY = "allowedCardNetworks"
        internal const val ALLOWED_AUTH_METHODS_KEY = "allowedAuthMethods"
        internal const val TOTAL_PRICE_STATUS_KEY = "totalPriceStatus"
        internal const val ALLOW_PREPAID_CARDS_KEY = "allowPrepaidCards"
        internal const val BILLING_ADDRESS_REQUIRED_KEY = "billingAddressRequired"
        internal const val EMAIL_REQUIRED_KEY = "emailRequired"
        internal const val SHIPPING_ADDRESS_REQUIRED_KEY = "shippingAddressRequired"
        internal const val EXISTING_PAYMENT_METHOD_REQUIRED_KEY = "existingPaymentMethodRequired"
        internal const val BILLING_ADDRESS_PARAMETERS_KEY = "shippingAddressParameters"
        internal const val SHIPPING_ADDRESS_PARAMETERS_KEY = "billingAddressParameters"
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(GOOGLEPAY_KEY)) {
            this.config = config.getMap(GOOGLEPAY_KEY)!!
        } else {
            this.config = config
        }
    }

    private val shippingAddressParameters: ShippingAddressParameters?
        get() {
            return try {
                val map = config.getMap(SHIPPING_ADDRESS_PARAMETERS_KEY)
                ShippingAddressParameters.SERIALIZER.deserialize(
                    ReactNativeJson.convertMapToJson(
                        map
                    )
                )
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse shippingAddressParameters")
                null
            }
        }

    private val billingAddressParameters: BillingAddressParameters?
        get() {
            return try {
                val map = config.getMap(BILLING_ADDRESS_PARAMETERS_KEY)
                BillingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse billingAddressParameters")
                null
            }
        }

    private val allowedCardNetworks: List<String>
        get() {
            return config.getArray(ALLOWED_CARD_NETWORKS_KEY)?.toArrayList().orEmpty().map {
                it.toString()
            }
        }

    private val allowedAuthMethods: List<String>
        get() {
            return config.getArray(ALLOWED_AUTH_METHODS_KEY)?.toArrayList().orEmpty().map {
                it.toString()
            }
        }

    fun applyConfiguration(builder: GooglePayConfiguration.Builder) {
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
    }

}