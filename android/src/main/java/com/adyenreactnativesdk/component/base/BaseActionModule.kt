/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.mainEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

open class BaseActionModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(reactContext, messageBus) {
  override fun supportedEvents(): List<String> = EventName.mainEvents()

  protected fun parseActionFromMap(actionMap: ReadableMap?): Action =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      Action.SERIALIZER.deserialize(jsonObject)
    } catch (e: JSONException) {
      throw ModuleException.InvalidAction(e)
    }
}
