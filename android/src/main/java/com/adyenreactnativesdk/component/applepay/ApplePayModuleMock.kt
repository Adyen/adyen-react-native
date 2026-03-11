/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.applepay

import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ApplePayModuleMock(
  context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(context, messageBus) {
  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = listOf(EventName.ERROR.value)

  override fun hide(
    success: Boolean,
    message: ReadableMap?,
  ): Unit = throw NotImplementedError()

//  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("supportedEvents" to supportedEvents())

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenApplePay"
  }

  @ReactMethod
  fun open(
    paymentMethodsData: ReadableMap,
    configuration: ReadableMap,
  ) {
    sendError(ModuleException.NotSupported())
  }

  @ReactMethod
  fun isAvailable(
    paymentMethods: ReadableMap,
    configuration: ReadableMap,
    promise: Promise,
  ) {
    promise.resolve(false)
  }
}
