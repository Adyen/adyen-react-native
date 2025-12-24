package com.adyenreactnativesdk.component

import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.sessions.core.CheckoutSessionProvider
import com.adyen.checkout.sessions.core.CheckoutSessionResult
import com.adyen.checkout.sessions.core.SessionModel
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SessionHelperModule(
  context: ReactApplicationContext?,
) : BaseModule(context) {
  @ReactMethod
  fun addListener(eventName: String?) {
    // Required for NativeEventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int?) {
    // Required for NativeEventEmitter
  }

  @ReactMethod
  fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) { // No UI
    cleanup()
  }

  override fun getName(): String = COMPONENT_NAME

  @ReactMethod
  fun createSession(
    sessionModelJSON: ReadableMap,
    configurationJSON: ReadableMap,
    promise: Promise,
  ) {
    appCompatActivity.lifecycleScope.launch(Dispatchers.IO) {
      createSessionAsync(sessionModelJSON, configurationJSON, promise)
    }
  }

  suspend fun createSessionAsync(
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

    val session =
      when (val result = CheckoutSessionProvider.createSession(sessionModel, configuration)) {
        is CheckoutSessionResult.Success -> {
          result.checkoutSession
        }

        is CheckoutSessionResult.Error -> {
          promise.reject(ModuleException.SessionError(result.exception))
          return
        }
      }

    val json = SessionSetupResponse.SERIALIZER.serialize(session.sessionSetupResponse)
    val map = ReactNativeJson.convertJsonToMap(json)
    setSession(session)
    promise.resolve(map)
  }

  private fun parseSessionModel(json: ReadableMap): SessionModel {
    val sessionModelJSON = ReactNativeJson.convertMapToJson(json)
    return SessionModel.SERIALIZER.deserialize(sessionModelJSON)
  }

  companion object {
    private const val COMPONENT_NAME = "SessionHelper"
  }
}
