package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.api.Environment
import com.facebook.react.bridge.ReadableMap
import com.adyen.checkout.googlepay.util.AllowedCardNetworks
import com.google.android.gms.wallet.WalletConstants
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.googlepay.model.BillingAddressParameters
import com.adyen.checkout.googlepay.model.ShippingAddressParameters
import com.adyenreactnativesdk.component.dropin.AdyenCheckoutService
import com.adyenreactnativesdk.util.ReactNativeJson
import org.json.JSONException
import java.util.*

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
            try {
                val map = config.getMap(SHIPPING_ADDRESS_PARAMETERS_KEY)
                return ShippingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse shippingAddressParameters")
                return null
            }
        }

    private val billingAddressParameters: BillingAddressParameters?
        get() {
            try {
                val map = config.getMap(BILLING_ADDRESS_PARAMETERS_KEY)
                return BillingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
            } catch (e: JSONException) {
                Log.w(TAG, e.message ?: "Unable to parse billingAddressParameters")
                return null
            }
        }

    private val allowedCardNetworks: List<String>
        get() {
            val list: List<Any> =
                config.getArray(ALLOWED_CARD_NETWORKS_KEY)?.toArrayList() ?: emptyList()
            val strings: MutableList<String> = ArrayList(list.size)
            val allowedCardNetworks: Set<String> =
                HashSet(AllowedCardNetworks.getAllAllowedCardNetworks())
            for (cardNetwork in list.map { it.toString().toUpperCase(Locale.ROOT) }) {
                if (allowedCardNetworks.contains(cardNetwork)) {
                    strings.add(cardNetwork)
                } else {
                    Log.w(TAG, "skipping brand $cardNetwork, as it is not an allowed card network.")
                }
            }
            return strings
        }

    private val allowedAuthMethods: List<String>
        get() {
            val list: List<Any> =
                config.getArray(ALLOWED_AUTH_METHODS_KEY)?.toArrayList() ?: emptyList()
            val strings: MutableList<String> = ArrayList(list.size)
            for (`object` in list) {
                strings.add(`object`.toString())
            }
            return strings
        }

    private fun getGooglePayEnvironment(environment: Environment): Int {
        if (config.hasKey(GOOGLEPAY_ENVIRONMENT_KEY)) {
            return config.getInt(GOOGLEPAY_ENVIRONMENT_KEY)
        }
        return when (environment) {
            Environment.TEST -> WalletConstants.ENVIRONMENT_TEST
            else -> WalletConstants.ENVIRONMENT_PRODUCTION
        }
    }

    fun getConfiguration(builder: GooglePayConfiguration.Builder): GooglePayConfiguration {
        builder.setGooglePayEnvironment(getGooglePayEnvironment(builder.builderEnvironment))
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
            builder.setTotalPriceStatus(config.getString(TOTAL_PRICE_STATUS_KEY))
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