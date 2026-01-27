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
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

abstract class BaseModule(
  reactContext: ReactApplicationContext?,
  val messageBus: MessageBus,
) : ReactContextBaseJavaModule(reactContext) {
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

  protected fun cleanup() {
    session = null
    AdyenCheckout.removeComponent()
  }

  protected fun sendError(exception: Exception) {
    if (session == null) {
      messageBus.onException(exception)
    } else {
      messageBus.onSessionException(exception)
    }
  }

  protected val appCompatActivity: AppCompatActivity
    get() {
      val currentActivity = getCurrentActivity()
      return currentActivity as AppCompatActivity?
        ?: throw Exception("Not an AppCompact Activity")
    }

  companion object {
    @JvmStatic
    var session: CheckoutSession? = null
      internal set
  }
}
