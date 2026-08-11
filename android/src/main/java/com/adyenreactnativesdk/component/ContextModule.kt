/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component

import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.components.paymentmethod.PaymentMethodTypes
import com.adyen.checkout.core.sessions.SessionResponse
import com.adyen.checkout.core.sessions.internal.data.model.SessionSetupResponse
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.googlepay.GooglePayAvailability
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.sessionEvents
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.launch

class ContextModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(reactContext, messageBus) {
  /** Pre-built controllers keyed by payment method type, populated by [requiresUserInteraction]. */
  private val componentManagers: MutableMap<String, ComponentManager> = mutableMapOf()

  override fun supportedEvents(): List<String> = EventName.sessionEvents()

  @ReactMethod
  fun setSdkVersion(sdkVersion: String) {
    BaseModule.sdkVersion = sdkVersion
  }

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  @ReactMethod
  override fun completion(resultCode: String) {
    currentModule?.completion(resultCode)
    cleanup()
  }

  @ReactMethod
  override fun retry(message: String?) {
    currentModule?.retry(message)
  }

  @ReactMethod
  override fun cleanup() {
    componentManagers.values.forEach { it.dispose() }
    componentManagers.clear()
    super.cleanup()
  }

  @ReactMethod
  fun isAvailable(
    type: String,
    promise: Promise,
  ) {
    val context = BaseModule.checkoutContext
    if (context == null) {
      promise.resolve(false)
      return
    }

    when {
      // Apple Pay is not available on Android.
      APPLE_PAY_KEYS.contains(type) -> {
        promise.resolve(false)
      }

      GOOGLE_PAY_KEYS.contains(type) -> {
        if (!hasPaymentMethod(context, type)) {
          promise.resolve(false)
          return
        }
        appCompatActivity.lifecycleScope.launch {
          try {
            val available =
              GooglePayAvailability.isAvailable(
                context = appCompatActivity.applicationContext,
                environment = context.checkoutConfiguration.environment,
                allowedAuthMethods = null,
                allowedCardNetworks = null,
                paymentMethodBrands = emptyList(),
              )
            promise.resolve(available)
          } catch (e: Exception) {
            promise.reject(e)
          }
        }
      }

      else -> {
        promise.resolve(hasPaymentMethod(context, type))
      }
    }
  }

  @ReactMethod
  fun requiresUserInteraction(
    type: String,
    promise: Promise,
  ) {
    val context = BaseModule.checkoutContext
    if (context == null) {
      promise.reject(ModuleException.Unknown("Checkout context is not initialized"))
      return
    }

    appCompatActivity.lifecycleScope.launch {
      try {
        val controller = resolveController(context, type)
        if (controller == null) {
          promise.reject(ModuleException.NoPaymentMethod(type))
          return@launch
        }
        promise.resolve(controller.requiresUserInteraction())
      } catch (e: Exception) {
        promise.reject(e)
      }
    }
  }

  @ReactMethod
  fun submit(type: String) {
    val context = BaseModule.checkoutContext ?: return
    appCompatActivity.lifecycleScope.launch {
      try {
        resolveController(context, type)?.submit()
      } catch (e: Exception) {
        sendError(e)
      }
    }
  }

  /** Returns (building and caching if needed) the controller for [type] within [context]. */
  private suspend fun resolveController(
    context: CheckoutContext,
    type: String,
  ) = componentManagers
    .getOrPut(type) { ComponentManager(appCompatActivity, messageBus) }
    .let { it.checkoutController ?: it.createController(context, type) }

  private fun hasPaymentMethod(
    context: CheckoutContext,
    type: String,
  ): Boolean = paymentMethodsOf(context)?.paymentMethods?.any { it.type == type } == true

  private fun paymentMethodsOf(context: CheckoutContext): PaymentMethods? =
    when (context) {
      is CheckoutContext.Sessions -> context.checkoutSession.sessionSetupResponse.paymentMethods
      is CheckoutContext.Advanced -> context.paymentMethods
      else -> null
    }

  override fun getName(): String = COMPONENT_NAME

  @ReactMethod
  fun setup(
    sessionModelJSON: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    appCompatActivity.lifecycleScope.launch {
      setupSessionAsync(sessionModelJSON, configurationJSON, promise)
    }
  }

  suspend fun setupSessionAsync(
    sessionModelJSON: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    // Re-setup must never reuse stale controllers or a dangling checkout context.
    cleanup()
    BaseModule.storedConfigurationJSON = configurationJSON
    val sessionResponse: SessionResponse
    val configuration: CheckoutConfiguration
    try {
      sessionResponse = parseSessionResponse(sessionModelJSON)
      configuration = CheckoutConfigurationFactory.get(configurationJSON)
    } catch (e: java.lang.Exception) {
      promise.reject(ModuleException.SessionError(e))
      return
    }

    val sessionsContext =
      when (val result = Checkout.setup(sessionResponse, configuration)) {
        is Checkout.Result.Success -> {
          result.checkoutContext
        }

        is Checkout.Result.Error -> {
          promise.reject(ModuleException.SessionError(result.error.cause ?: RuntimeException(result.error.message)))
          return
        }
      }

    val jsonObject = SessionSetupResponse.SERIALIZER.serialize(sessionsContext.checkoutSession.sessionSetupResponse)
    val sessionSetupResponseMap = ReactNativeJson.convertJsonToMap(jsonObject)
    BaseModule.checkoutContext = sessionsContext
    promise.resolve(sessionSetupResponseMap)
  }

  @ReactMethod
  fun setupAdvanced(
    paymentMethodsData: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    appCompatActivity.lifecycleScope.launch {
      setupAdvancedAsync(paymentMethodsData, configurationJSON, promise)
    }
  }

  private suspend fun setupAdvancedAsync(
    paymentMethodsData: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    // Re-setup must never reuse stale controllers or a dangling checkout context.
    cleanup()
    BaseModule.storedConfigurationJSON = configurationJSON
    val paymentMethods: PaymentMethods
    val configuration: CheckoutConfiguration
    try {
      paymentMethods = getPaymentMethods(paymentMethodsData)
      configuration = CheckoutConfigurationFactory.get(configurationJSON)
    } catch (e: Exception) {
      promise.reject(ModuleException.Unknown(e.message))
      return
    }

    when (val result = Checkout.setup(paymentMethods, configuration)) {
      is Checkout.Result.Success -> {
        BaseModule.checkoutContext = result.checkoutContext
        promise.resolve(null)
      }

      is Checkout.Result.Error -> {
        promise.reject(ModuleException.Unknown(result.error.message))
      }
    }
  }

  private fun parseSessionResponse(json: ReadableMap): SessionResponse {
    val sessionResponseJSON = ReactNativeJson.convertMapToJson(json)
    return SessionResponse(
      id = sessionResponseJSON.optString(ID),
      sessionData = sessionResponseJSON.optString(SESSION_DATA, null),
    )
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenContext"
    private const val ID = "id"
    private const val SESSION_DATA = "sessionData"
    private val GOOGLE_PAY_KEYS =
      setOf(PaymentMethodTypes.GOOGLE_PAY_LEGACY, PaymentMethodTypes.GOOGLE_PAY)
    private val APPLE_PAY_KEYS = setOf("applepay")
  }
}
