/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.appcompat.app.AppCompatActivity
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.CheckoutSessionProvider
import com.adyen.checkout.sessions.core.CheckoutSessionResult
import com.adyen.checkout.sessions.core.SessionModel
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.MessageBus
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

abstract class BaseModule(
  context: ReactApplicationContext?,
) : ReactContextBaseJavaModule(context) {

  internal var integration = if (session == null) "advanced" else "session"

  abstract var messageBus: MessageBus

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

  open suspend fun createSessionAsync(
    sessionModelJSON: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    val sessionModel: SessionModel
    val configuration: CheckoutConfiguration
    try {
      sessionModel = parseSessionModel(sessionModelJSON)
      configuration = CheckoutConfigurationFactory.get(configurationJSON)
    } catch (e: java.lang.Exception) {
      promise.reject(ModuleException.SessionError(e))
      return
    }

    session =
      when (val result = CheckoutSessionProvider.createSession(sessionModel, configuration)) {
        is CheckoutSessionResult.Success -> result.checkoutSession
        is CheckoutSessionResult.Error -> {
          promise.reject(ModuleException.SessionError(null))
          return
        }
      }

    session?.sessionSetupResponse?.let {
      val json = SessionSetupResponse.SERIALIZER.serialize(it)
      val map = ReactNativeJson.convertJsonToMap(json)
      promise.resolve(map)
    }
  }

  private fun parseSessionModel(json: ReadableMap): SessionModel {
    val sessionModelJSON = ReactNativeJson.convertMapToJson(json)
    return SessionModel.SERIALIZER.deserialize(sessionModelJSON)
  }

  open fun getRedirectUrl(): String? = null

  protected fun cleanup() {
    session = null
    AdyenCheckout.removeComponent()
    AdyenCheckout.removeDropInListener()
    CheckoutProxy.shared.componentListener = null
  }

  companion object {
    const val DID_COMPLETE = "didCompleteCallback"
    const val DID_PROVIDE = "didProvideCallback"
    const val DID_FAILED = "didFailCallback"
    const val DID_SUBMIT = "didSubmitCallback"
    const val DID_UPDATE_ADDRESS = "didUpdateAddressCallback"
    const val DID_CONFIRM_ADDRESS = "didConfirmAddressCallback"
    const val DID_DISABLE_STORED_PAYMENT_METHOD = "didDisableStoredPaymentMethodCallback"
    const val DID_CHECK_BALANCE = "didCheckBalanceCallback"
    const val DID_REQUEST_ORDER = "didRequestOrderCallback"
    const val DID_CANCEL_ORDER = "didCancelOrderCallback"
    const val DID_BIN_LOOKUP = "didBinLookupCallback"
    const val DID_CHANGE_BIN_VALUE = "didChangeBinValueCallback"

    const val RESULT_CODE_PRESENTED = "PresentToShopper"

    @JvmStatic
    var session: CheckoutSession? = null
      private set
  }
}

