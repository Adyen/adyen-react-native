/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.appcompat.app.AppCompatActivity
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

abstract class BaseModule(
  context: ReactApplicationContext?,
) : ReactContextBaseJavaModule(context) {
  internal var integration = if (session == null) "advanced" else "session"

  protected fun getPaymentMethodsApiResponse(paymentMethods: ReadableMap?): PaymentMethodsApiResponse =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
      PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject)
    } catch (e: JSONException) {
      throw ModuleException.InvalidPaymentMethods(e)
    }

  protected fun getPaymentMethod(
    paymentMethodsResponse: PaymentMethodsApiResponse,
    paymentMethodNames: Set<String>,
  ): PaymentMethod? = paymentMethodsResponse.paymentMethods?.firstOrNull { paymentMethodNames.contains(it.type) }

  protected val appCompatActivity: AppCompatActivity
    get() {
      val currentActivity = reactApplicationContext.currentActivity
      return currentActivity as AppCompatActivity?
        ?: throw Exception("Not an AppCompact Activity")
    }

  protected fun setSession(session: CheckoutSession) {
    BaseModule.session = session
  }

  protected fun cleanup() {
    session = null
    AdyenCheckout.removeComponent()
    AdyenCheckout.removeDropInListener()
  }

  companion object {
    @JvmStatic
    var session: CheckoutSession? = null
      private set
  }
}
