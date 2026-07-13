package com.adyenreactnativesdk.cse

import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.threeds2.ThreeDS2Service
import com.adyenreactnativesdk.component.base.AppCompatModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ActionModule(
  reactContext: ReactApplicationContext?,
) : AppCompatModule(reactContext),
  ActionComponentCallback {
  private var promise: Promise? = null

  override fun getName(): String = COMPONENT_NAME

  override fun getConstants(): MutableMap<String, Any> = hashMapOf(THREEDS_VERSION_NAME to threeDS2Version)

  @ReactMethod
  fun handle(
    actionMap: ReadableMap,
    configuration: ReadableMap,
    promise: Promise,
  ) {
    this.promise = promise
    val action: Action
    val checkoutConfiguration: CheckoutConfiguration
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      action = Action.SERIALIZER.deserialize(jsonObject)
      checkoutConfiguration = CheckoutConfigurationFactory.get(configuration)
    } catch (e: ModuleException) {
      promise.reject(e.code, e.message, e)
      return
    } catch (e: Exception) {
      promise.reject(PARSING_ERROR, e.message, e)
      return
    }
    currentCallback = this
    ActionFragment.show(
      appCompatActivity.supportFragmentManager,
      checkoutConfiguration,
      action,
    )
  }

  @ReactMethod
  fun hide(success: Boolean?) {
    ActionFragment.hide(appCompatActivity.supportFragmentManager)
    currentCallback = null
    promise = null
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenAction"
    private val threeDS2Version by lazy { ThreeDS2Service.INSTANCE.sdkVersion }
    private const val THREEDS_VERSION_NAME = "threeDS2SdkVersion"
    private const val COMPONENT_ERROR = "actionError"
    private const val PARSING_ERROR = "parsingError"

    /** Live callback re-sourced by [ActionFragment] after re-creation. */
    internal var currentCallback: ActionComponentCallback? = null
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    val json = ActionComponentData.SERIALIZER.serialize(actionComponentData)
    promise?.resolve(ReactNativeJson.convertJsonToMap(json))
  }

  override fun onError(componentError: ComponentError) {
    if (componentError.exception is CancellationException) {
      promise?.reject(
        ModuleException.Canceled().code,
        ModuleException.Canceled().message,
        ModuleException.Canceled(),
      )
    } else {
      promise?.reject(COMPONENT_ERROR, componentError.errorMessage, componentError.exception)
    }
  }
}
