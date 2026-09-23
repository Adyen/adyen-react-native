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
import com.adyenreactnativesdk.component.base.BaseActionModule
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge
import com.adyenreactnativesdk.component.googlepay.GooglePayAvailability
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.sessionEvents
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.launch

class ContextModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseActionModule(reactContext, messageBus),
  LifecycleEventListener {
  init {
    reactContext?.addLifecycleEventListener(this)
  }

  /** Legacy bridge responses can reach only the current operation owner, never map-order state. */
  private fun awaitingManager(): ComponentManager? =
    CheckoutCoordinator.shared.activeOperationId()?.let(CheckoutCoordinator.shared::manager)

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    CheckoutCoordinator.shared.hostDidDisappear()
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    CheckoutCoordinator.shared.hostDidDisappear()
    super.invalidate()
  }

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

  /** Forwards a JS-provided action to the suspended `onSubmit` closure (e.g. 3DS). No-op if none pending. */
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
    // Advanced flow: resolve the suspended closure; fall back to cleanup() when nothing is pending.
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
    CheckoutCoordinator.shared.invalidate()
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
        val manager =
          ComponentManager(
            activity = appCompatActivity,
            messageBus = messageBus,
            sessionBeforeSubmitBridge = BaseModule.checkoutState?.sessionBeforeSubmitBridge,
          )
        val controller = manager.createController(context, type)
        if (controller == null) {
          manager.dispose()
          promise.reject(ModuleException.NoPaymentMethod(type))
          return@launch
        }
        promise.resolve(controller.requiresUserInteraction())
        manager.dispose()
      } catch (e: Exception) {
        promise.reject(e)
      }
    }
  }

  /**
   * Submits [type] headlessly, with no `<AdyenComponent>` mounted; hosts any resulting UI (redirect,
   * 3DS) in a [CheckoutFragment], shown until [ComponentManager]'s `onTerminal` fires.
   */
  @ReactMethod
  fun submit(type: String) {
    val state = BaseModule.checkoutState
    if (state == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
      return
    }
    val context = state.checkoutContext
    appCompatActivity.lifecycleScope.launch {
      var operationId: String? = null
      try {
        operationId = CheckoutCoordinator.shared.beginOperation()
        val currentOperationId = checkNotNull(operationId)
        val fragmentTag = headlessFragmentTag(currentOperationId)
        val manager =
          ComponentManager(
            activity = appCompatActivity,
            messageBus = messageBus,
            sessionBeforeSubmitBridge = state.sessionBeforeSubmitBridge,
            onTerminal = {
              CheckoutFragment.hide(appCompatActivity.supportFragmentManager, fragmentTag)
              CheckoutCoordinator.shared.unregisterManager(currentOperationId)
              CheckoutCoordinator.shared.completeOperation(currentOperationId)
            },
          )
        CheckoutCoordinator.shared.registerManager(currentOperationId, manager)
        val controller =
          manager.createController(context, type)
            ?: run {
              CheckoutCoordinator.shared.unregisterManager(currentOperationId)
              CheckoutCoordinator.shared.completeOperation(currentOperationId)
              return@launch
            }
        CheckoutFragment.show(
          fragmentManager = appCompatActivity.supportFragmentManager,
          tag = fragmentTag,
          controllerProvider = { controller },
          autoSubmit = true,
          // Closing the fragment is treated as a shopper cancellation of the payment.
          onCancelled = {
            sendError(ModuleException.Canceled())
            CheckoutCoordinator.shared.unregisterManager(currentOperationId)
            CheckoutCoordinator.shared.completeOperation(currentOperationId)
          },
        )
      } catch (e: Exception) {
        operationId?.let {
          CheckoutCoordinator.shared.unregisterManager(it)
          CheckoutCoordinator.shared.completeOperation(it)
        }
        sendError(e)
      }
    }
  }

  private fun headlessFragmentTag(operationId: String) = "HeadlessSubmit-$operationId"

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
    val sessionResponse: SessionResponse
    val configuration: CheckoutConfiguration
    try {
      sessionResponse = parseSessionResponse(sessionModelJSON)
      configuration = CheckoutConfigurationFactory.get(configurationJSON)
    } catch (e: java.lang.Exception) {
      promise.reject(ModuleException.SessionError(e))
      return
    }

    try {
      CheckoutCoordinator.shared.setupAsync {
        when (val result = Checkout.setup(sessionResponse, configuration)) {
          is Checkout.Result.Success -> {
            val state =
              CheckoutState(
                checkoutContext = result.checkoutContext,
                sessionBeforeSubmitBridge = SessionBeforeSubmitBridge(messageBus),
              )
            CheckoutFlow(state)
          }

          is Checkout.Result.Error -> {
            throw ModuleException.SessionError(result.error.cause ?: RuntimeException(result.error.message))
          }
        }
      }
    } catch (e: Exception) {
      promise.reject(e)
      return
    }
    val sessionsContext = checkNotNull(BaseModule.checkoutState).checkoutContext as CheckoutContext.Sessions
    val jsonObject = SessionSetupResponse.SERIALIZER.serialize(sessionsContext.checkoutSession.sessionSetupResponse)
    val sessionSetupResponseMap = ReactNativeJson.convertJsonToMap(jsonObject)
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
    val paymentMethods: PaymentMethods
    val configuration: CheckoutConfiguration
    try {
      paymentMethods = getPaymentMethods(paymentMethodsData)
      configuration = CheckoutConfigurationFactory.get(configurationJSON)
    } catch (e: Exception) {
      promise.reject(ModuleException.Unknown(e.message))
      return
    }

    try {
      CheckoutCoordinator.shared.setupAsync {
        when (val result = Checkout.setup(paymentMethods, configuration)) {
          is Checkout.Result.Success -> CheckoutFlow(CheckoutState(checkoutContext = result.checkoutContext))
          is Checkout.Result.Error -> throw ModuleException.Unknown(result.error.message)
        }
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject(e)
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
    private const val COMPONENT_NAME = "AdyenCheckout"
    private const val ID = "id"
    private const val SESSION_DATA = "sessionData"
    private val GOOGLE_PAY_KEYS =
      setOf(PaymentMethodTypes.GOOGLE_PAY_LEGACY, PaymentMethodTypes.GOOGLE_PAY)
    private val APPLE_PAY_KEYS = setOf("applepay")
  }
}

/** A committed coordinator flow owns the legacy context reference and cancels pending callbacks. */
private class CheckoutFlow(
  override val checkoutState: CheckoutState,
) : CheckoutStateOwner {
  private var disposed = false

  override fun dispose() {
    if (disposed) return
    disposed = true
    checkoutState.sessionBeforeSubmitBridge?.cancel()
  }
}
