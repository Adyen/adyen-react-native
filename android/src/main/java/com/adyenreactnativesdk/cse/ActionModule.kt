/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.ActionOnlyCheckoutCallbacks
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.threeds2.ThreeDS2Service
import com.adyenreactnativesdk.CheckoutControllerRegistry
import com.adyenreactnativesdk.component.base.AppCompatModule
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.KnownException
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.toModuleException
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.launch

class ActionModule(
  reactContext: ReactApplicationContext?,
) : AppCompatModule(reactContext) {
  private var promise: Promise? = null

  override fun getName(): String = COMPONENT_NAME

  override fun getConstants(): MutableMap<String, Any> = hashMapOf(THREEDS_VERSION_NAME to threeDS2Version)

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

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

    appCompatActivity.lifecycleScope.launch {
      when (val result = Checkout.setup(action, checkoutConfiguration)) {
        is Checkout.Result.Success -> {
          currentController =
            CheckoutController(
              context = result.checkoutContext,
              callbacks = actionCallbacks(),
              coroutineScope = appCompatActivity.lifecycleScope,
            ).also { CheckoutControllerRegistry.register(it) }
          CheckoutFragment.show(
            fragmentManager = appCompatActivity.supportFragmentManager,
            tag = FRAGMENT_TAG,
            controllerProvider = { currentController },
            cancellable = false,
          )
        }

        is Checkout.Result.Error -> {
          reject(result.error.toModuleException())
        }
      }
    }
  }

  @ReactMethod
  fun hide(success: Boolean?) {
    CheckoutFragment.hide(appCompatActivity.supportFragmentManager, FRAGMENT_TAG)
    currentController?.let { CheckoutControllerRegistry.unregister(it) }
    currentController = null
    promise = null
  }

  private fun actionCallbacks(): ActionOnlyCheckoutCallbacks =
    ActionOnlyCheckoutCallbacks(
      onAdditionalDetails = { data ->
        resolve(data)
        AdditionalDetailsResult.Completion(CheckoutResultCode.AUTHORISED.value)
      },
      onFailure = { error -> reject(error.toModuleException()) },
    )

  private fun resolve(data: ActionComponentData) {
    val json = ActionComponentData.SERIALIZER.serialize(data)
    promise?.resolve(ReactNativeJson.convertJsonToMap(json))
    promise = null
  }

  private fun reject(exception: Exception) {
    val code = (exception as? KnownException)?.code ?: COMPONENT_ERROR
    promise?.reject(code, exception.message, exception)
    promise = null
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenAction"
    private const val FRAGMENT_TAG = "ActionFragment"
    private var threeDS2Version = ThreeDS2Service.INSTANCE.sdkVersion
    private const val THREEDS_VERSION_NAME = "threeDS2SdkVersion"
    private const val COMPONENT_ERROR = "actionError"
    private const val PARSING_ERROR = "parsingError"

    internal var currentController: CheckoutController? = null
      private set
  }
}
