package com.adyenreactnativesdk.component.message

import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.MessageBus
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class MessageBusModule(
  val context: ReactApplicationContext?,
) : BaseModule(context) {
  override var messageBus = MessageBus(reactApplicationContext)

  override fun getName(): String = COMPONENT_NAME

  var listenerCouunt = 0

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
    listenerCouunt = listenerCouunt++
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  @ReactMethod
  fun subscribe(id: String) {
  }

  @ReactMethod
  fun unsubscribe(id: String) {
  }

  @ReactMethod
  fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) {
    cleanup()
  }

  @ReactMethod
  fun handle(actionMap: ReadableMap?) {
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action = Action.SERIALIZER.deserialize(jsonObject)
      consumers.entries
        .first()
        .value
        .onAction(action)
    } catch (e: JSONException) {
      messageBus.sendErrorEvent(ModuleException.InvalidAction(e))
    }
  }

  companion object {
    private const val TAG = "MessageBusModule"
    private const val COMPONENT_NAME = "AdyenMessageBus"
    var consumers: MutableMap<String, ComponentContract> = mutableMapOf()
  }
}
