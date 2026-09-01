/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component

import android.util.Log
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.components.paymentmethod.PaymentMethodTypes
import com.adyen.checkout.core.sessions.SessionResponse
import com.adyen.checkout.core.sessions.internal.data.model.SessionSetupResponse
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.BaseActionModule
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge
import com.adyenreactnativesdk.component.googlepay.GooglePayAvailability
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.EventSource
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.TaggedEmitter
import com.adyenreactnativesdk.util.messaging.sessionEvents
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.launch

class ContextModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseActionModule(reactContext, messageBus) {
  /** Pre-built controllers keyed by payment method type, populated by [requiresUserInteraction]. */
  private val componentManagers: MutableMap<String, ComponentManager> = mutableMapOf()

  /**
   * The manager whose SDK closure is suspended waiting on JS, if any.
   *
   * Headless payments can build a manager per payment method type, but only one can be mid-flight,
   * so the awaiting manager is the unambiguous target for `action` / `completion` / `retry`.
   */
  private fun awaitingManager(): ComponentManager? = componentManagers.values.firstOrNull { it.isAwaitingResult }

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
  fun provideBeforeSubmitResult(result: ReadableMap?) {
    BaseModule.checkoutState?.sessionBeforeSubmitBridge?.provide(result)
  }

  /**
   * Forwards a JS-provided action into the suspended `onSubmit` closure so the SDK can present it
   * (e.g. 3DS). No-op when nothing is pending.
   */
  @ReactMethod
  fun action(actionMap: ReadableMap?) {
    val manager = awaitingManager()
    if (manager == null) {
      Log.w(TAG, "No pending payment is awaiting an action")
      return
    }
    try {
      manager.handleAction(parseActionFromMap(actionMap))
    } catch (e: Exception) {
      sendError(e)
    }
  }

  @ReactMethod
  fun completion(resultCode: String) {
    if (BaseModule.checkoutState == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
    }
    // Advanced flow: resolve the suspended SDK closure instead of tearing the context down.
    // Only fall back to cleanup() when nothing is pending, which preserves session behaviour.
    val manager = awaitingManager()
    if (manager != null) {
      manager.completion(resultCode)
      return
    }
    cleanup()
  }

  @ReactMethod
  fun retry(message: String?) {
    if (BaseModule.checkoutState == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
    }
    awaitingManager()?.retry(message)
  }

  /** Called from JS terminal callbacks (onComplete / onError) via performAutoCleanup(). */
  @ReactMethod
  override fun cleanup() {
    BaseModule.checkoutState?.sessionBeforeSubmitBridge?.cancel()
    componentManagers.values.forEach { it.dispose() }
    componentManagers.clear()
    ComponentModule.clearConsumers()
    super.cleanup()
  }

  @ReactMethod
  fun isAvailable(
    type: String,
    promise: Promise,
  ) {
    val context = BaseModule.checkoutState?.checkoutContext
    if (context == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
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
    val context = BaseModule.checkoutState?.checkoutContext
    if (context == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
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
    val state = BaseModule.checkoutState
    if (state == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
      return
    }
    val context = state.checkoutContext
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
    .getOrPut(type) {
      ComponentManager(
        activity = appCompatActivity,
        // Must be the context-tagged bus, not the shared `messageBus`. ComponentManager is also
        // used by embedded views, which inject a viewId-tagged bus; anything built on the untagged
        // shared bus is read by JS as Drop-in and its result would be routed to the wrong module.
        messageBus = MessageBus(TaggedEmitter.forSource(AdyenPaymentPackage.emitter, EventSource.CONTEXT)),
        // Deliberately the context-owned bridge on the *untagged* bus: before-submit must never
        // carry a tag, or the JS router would filter it out and deadlock the session flow.
        sessionBeforeSubmitBridge = BaseModule.checkoutState?.sessionBeforeSubmitBridge,
      )
    }.let { it.checkoutController ?: it.createController(context, type) }

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
    // Re-setup: clear stale controllers without tearing down the native checkout context.
    // The native side replaces its own state when the new setup completes.
    BaseModule.checkoutState?.sessionBeforeSubmitBridge?.cancel()
    componentManagers.values.forEach { it.dispose() }
    componentManagers.clear()
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
    BaseModule.checkoutState =
      CheckoutState(
        checkoutContext = sessionsContext,
        configurationJSON = configurationJSON,
        sessionBeforeSubmitBridge = SessionBeforeSubmitBridge(messageBus),
      )
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
    // Re-setup: clear stale controllers without tearing down the native checkout context.
    // The native side replaces its own state when the new setup completes.
    componentManagers.values.forEach { it.dispose() }
    componentManagers.clear()
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
        BaseModule.checkoutState =
          CheckoutState(
            checkoutContext = result.checkoutContext,
            configurationJSON = configurationJSON,
          )
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
    private const val TAG = "ContextModule"
    private const val COMPONENT_NAME = "AdyenContext"
    private const val ID = "id"
    private const val SESSION_DATA = "sessionData"
    private val GOOGLE_PAY_KEYS =
      setOf(PaymentMethodTypes.GOOGLE_PAY_LEGACY, PaymentMethodTypes.GOOGLE_PAY)
    private val APPLE_PAY_KEYS = setOf("applepay")
  }
}
