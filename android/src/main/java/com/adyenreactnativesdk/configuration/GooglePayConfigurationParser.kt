/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import android.util.Log
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyen.checkout.googlepay.BillingAddressParameters
import com.adyen.checkout.googlepay.GooglePayAllowedPaymentMethods
import com.adyen.checkout.googlepay.ShippingAddressParameters
import com.adyen.checkout.googlepay.googlePay
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class GooglePayConfigurationParser(
  config: ReadableMap,
) {
  companion object {
    internal const val TAG = "GooglePayConfigParser"
    internal const val ROOT_KEY = "googlepay"
    internal const val MERCHANT_ACCOUNT_KEY = "merchantAccount"
    internal const val ALLOWED_CARD_NETWORKS_KEY = "allowedCardNetworks"
    internal const val ALLOWED_AUTH_METHODS_KEY = "allowedAuthMethods"
    internal const val TOTAL_PRICE_STATUS_KEY = "totalPriceStatus"
    internal const val ALLOW_PREPAID_CARDS_KEY = "allowPrepaidCards"
    internal const val ALLOW_CREDIT_CARDS_KEY = "allowCreditCards"
    internal const val BILLING_ADDRESS_REQUIRED_KEY = "billingAddressRequired"
    internal const val EMAIL_REQUIRED_KEY = "emailRequired"
    internal const val SHIPPING_ADDRESS_REQUIRED_KEY = "shippingAddressRequired"
    internal const val EXISTING_PAYMENT_METHOD_REQUIRED_KEY = "existingPaymentMethodRequired"
    internal const val BILLING_ADDRESS_PARAMETERS_KEY = "billingAddressParameters"
    internal const val SHIPPING_ADDRESS_PARAMETERS_KEY = "shippingAddressParameters"
  }

  private var config: ReadableMap

  init {
    if (config.hasKey(ROOT_KEY)) {
      this.config = config.getMap(ROOT_KEY)!!
    } else {
      this.config = config
    }
  }

  internal val shippingAddressParameters: ShippingAddressParameters?
    get() {
      if (!config.hasKey(SHIPPING_ADDRESS_PARAMETERS_KEY)) return null
      return try {
        val map = config.getMap(SHIPPING_ADDRESS_PARAMETERS_KEY)
        ShippingAddressParameters.SERIALIZER.deserialize(
          ReactNativeJson.convertMapToJson(
            map,
          ),
        )
      } catch (e: JSONException) {
        Log.w(TAG, e.message ?: "Unable to parse shippingAddressParameters")
        null
      }
    }

  internal val billingAddressParameters: BillingAddressParameters?
    get() {
      if (!config.hasKey(BILLING_ADDRESS_PARAMETERS_KEY)) return null
      return try {
        val map = config.getMap(BILLING_ADDRESS_PARAMETERS_KEY)
        BillingAddressParameters.SERIALIZER.deserialize(ReactNativeJson.convertMapToJson(map))
      } catch (e: JSONException) {
        Log.w(TAG, e.message ?: "Unable to parse billingAddressParameters")
        null
      }
    }

  internal val allowedCardNetworks: List<String>?
    get() {
      return if (config.hasKey(ALLOWED_CARD_NETWORKS_KEY)) {
        config
          .getArray(ALLOWED_CARD_NETWORKS_KEY)
          ?.toArrayList()
          .orEmpty()
          .map { it.toString() }
      } else {
        null
      }
    }

  internal val allowedAuthMethods: List<String>?
    get() {
      return if (config.hasKey(ALLOWED_AUTH_METHODS_KEY)) {
        config
          .getArray(ALLOWED_AUTH_METHODS_KEY)
          ?.toArrayList()
          .orEmpty()
          .map { it.toString() }
      } else {
        null
      }
    }

  internal val merchantAccount: String?
    get() =
      if (config.hasKey(MERCHANT_ACCOUNT_KEY)) config.getString(MERCHANT_ACCOUNT_KEY) else null

  internal val totalPriceStatus: String?
    get() =
      if (config.hasKey(TOTAL_PRICE_STATUS_KEY)) config.getString(TOTAL_PRICE_STATUS_KEY) else null

  internal val allowPrepaidCards: Boolean?
    get() =
      if (config.hasKey(ALLOW_PREPAID_CARDS_KEY)) config.getBoolean(ALLOW_PREPAID_CARDS_KEY) else null

  internal val allowCreditCards: Boolean?
    get() =
      if (config.hasKey(ALLOW_CREDIT_CARDS_KEY)) config.getBoolean(ALLOW_CREDIT_CARDS_KEY) else null

  internal val billingAddressRequired: Boolean?
    get() =
      if (config.hasKey(BILLING_ADDRESS_REQUIRED_KEY)) {
        config.getBoolean(BILLING_ADDRESS_REQUIRED_KEY)
      } else {
        null
      }

  internal val emailRequired: Boolean?
    get() =
      if (config.hasKey(EMAIL_REQUIRED_KEY)) config.getBoolean(EMAIL_REQUIRED_KEY) else null

  internal val shippingAddressRequired: Boolean?
    get() =
      if (config.hasKey(SHIPPING_ADDRESS_REQUIRED_KEY)) {
        config.getBoolean(SHIPPING_ADDRESS_REQUIRED_KEY)
      } else {
        null
      }

  internal val existingPaymentMethodRequired: Boolean?
    get() =
      if (config.hasKey(EXISTING_PAYMENT_METHOD_REQUIRED_KEY)) {
        config.getBoolean(EXISTING_PAYMENT_METHOD_REQUIRED_KEY)
      } else {
        null
      }

  fun applyConfiguration(
    configuration: CheckoutConfiguration,
    countryCode: String?,
  ) {
    configuration.googlePay(
      merchantAccount = merchantAccount,
      countryCode = countryCode,
      allowedPaymentMethods =
        GooglePayAllowedPaymentMethods(
          card =
            GooglePayAllowedPaymentMethods.Card(
              allowedAuthMethods = allowedAuthMethods,
              allowedCardNetworks = allowedCardNetworks,
              allowPrepaidCards = allowPrepaidCards,
              allowCreditCards = allowCreditCards,
              billingAddressRequired = billingAddressRequired,
              billingAddressParameters = billingAddressParameters,
            ),
        ),
      isEmailRequired = emailRequired,
      isExistingPaymentMethodRequired = existingPaymentMethodRequired,
      isShippingAddressRequired = shippingAddressRequired,
      shippingAddressParameters = shippingAddressParameters,
      totalPriceStatus = totalPriceStatus,
    )
  }
}
