/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.util.Log
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.mainEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

abstract class BaseActionModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(reactContext, messageBus) {
  override fun supportedEvents(): List<String> = EventName.mainEvents()

  protected fun parseAndHandleAction(actionMap: ReadableMap?) {
    try {
      val action = parseActionFromMap(actionMap)
      handleAction(action)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to parse and handle action", e)
      sendError(ModuleException.InvalidAction(e))
    }
  }

  protected fun parseActionFromMap(actionMap: ReadableMap?): Action =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      Action.SERIALIZER.deserialize(jsonObject)
    } catch (e: JSONException) {
      throw ModuleException.InvalidAction(e)
    }

  protected abstract fun handleAction(action: Action)

  protected fun sendAdditionalDetailsEvent(actionComponentData: ActionComponentData) {
    try {
      messageBus.onAdditionalDetails(actionComponentData)
    } catch (e: Exception) {
      Log.w(TAG, "Failed to send additional details event", e)
      sendError(e)
    }
  }

  protected fun sendCompleteEvent() {
    messageBus.onFinished()
  }

  private companion object {
    private const val TAG = "BaseActionModule"
  }
}
