/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodTypes
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.instant.IInstantFragment
import com.adyenreactnativesdk.component.instant.fragment.IdealFragment
import com.adyenreactnativesdk.component.instant.fragment.InstantFragment
import com.adyenreactnativesdk.component.instant.fragment.TwintFragment
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.mainEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class InstantModule(
  context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(context, messageBus) {
  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = EventName.mainEvents()

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("supportedEvents" to supportedEvents())

  @ReactMethod
  fun open(
    paymentMethodsData: ReadableMap,
    configuration: ReadableMap,
  ) {
    val checkoutConfiguration: CheckoutConfiguration
    val paymentMethod: PaymentMethod
    try {
      checkoutConfiguration = CheckoutConfigurationFactory.get(configuration)
      paymentMethod =
        getPaymentMethodsApiResponse(paymentMethodsData).paymentMethods?.firstOrNull()
          ?: throw ModuleException.InvalidPaymentMethods(null)
    } catch (e: Exception) {
      return sendError(e)
    }

    fragment =
      when (paymentMethod.type) {
        PaymentMethodTypes.IDEAL -> IdealFragment
        PaymentMethodTypes.TWINT -> TwintFragment
        else -> InstantFragment
      }

    fragment?.show(
      appCompatActivity.supportFragmentManager,
      checkoutConfiguration,
      paymentMethod,
      session,
    )
  }

  @ReactMethod
  fun handle(actionMap: ReadableMap?) {
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action = Action.SERIALIZER.deserialize(jsonObject)
      fragment?.handle(appCompatActivity.supportFragmentManager, action)
    } catch (e: JSONException) {
      sendError(ModuleException.InvalidAction(e))
    }
  }

  @ReactMethod
  fun hide(
    success: Boolean?,
    message: ReadableMap?,
  ) {
    cleanup()
    fragment?.hide(appCompatActivity.supportFragmentManager)
    fragment = null
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenInstant"
    private var fragment: IInstantFragment? = null
  }
}
