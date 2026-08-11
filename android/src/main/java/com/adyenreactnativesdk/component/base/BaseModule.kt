/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.annotation.SuppressLint
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatform
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatformParams
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethod
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

abstract class BaseModule(
  reactContext: ReactApplicationContext?,
  val messageBus: MessageBus,
) : AppCompatModule(reactContext) {
  /** Override to provide supported events for this module */
  abstract fun supportedEvents(): List<String>

  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("supportedEvents" to supportedEvents())

  abstract fun completion(resultCode: String)

  abstract fun retry(message: String?)

  protected fun getPaymentMethods(paymentMethods: ReadableMap?): PaymentMethods =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
      PaymentMethods.SERIALIZER.deserialize(jsonObject)
    } catch (e: JSONException) {
      throw ModuleException.InvalidPaymentMethods(e)
    }

  protected fun getPaymentMethod(
    paymentMethods: PaymentMethods,
    paymentMethodNames: Set<String>,
  ): PaymentMethod? = paymentMethods.paymentMethods?.firstOrNull { paymentMethodNames.contains(it.type) }

  protected open fun cleanup() {
    checkoutContext = null
    currentModule = null
  }

  protected fun sendError(exception: Exception) {
    if (session == null) {
      messageBus.onException(exception)
    } else {
      messageBus.onSessionException(exception)
    }
  }

  companion object {
    @Volatile
    internal var checkoutContext: CheckoutContext? = null

    var session: CheckoutContext.Sessions?
      get() = checkoutContext as? CheckoutContext.Sessions
      internal set(value) {
        checkoutContext = value
      }

    var currentModule: BaseModule? = null
      internal set

    @Volatile
    var sdkVersion: String? = null
      internal set

    // This is intended.
    @SuppressLint("RestrictedApi")
    fun configureAnalytics() {
      sdkVersion?.let {
        CheckoutPlatformParams.overrideForCrossPlatform(CheckoutPlatform.REACT_NATIVE, it)
      }
    }
  }
}
