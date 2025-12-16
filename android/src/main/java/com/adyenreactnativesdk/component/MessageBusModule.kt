package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class MessageBusModule(
  val context: ReactApplicationContext?,
  val messageBus: MessageBus,
) : BaseModule(context) {
  override fun getName(): String = COMPONENT_NAME

  @ReactMethod
  fun addListener(eventName: String?) {
  }

  @ReactMethod
  fun removeListeners(count: Int?) {
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
    val name =
      currentComponent ?: return messageBus.sendErrorEvent(ModuleException.NoPaymentRegistered())

    val component =
      consumers[name]
        ?: return messageBus.sendErrorEvent(ModuleException.NoConsumer(name))

    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action = Action.Companion.SERIALIZER.deserialize(jsonObject)
      component.onAction(action)
    } catch (e: JSONException) {
      messageBus.sendErrorEvent(ModuleException.InvalidAction(e))
    }
  }

  companion object {
    private const val TAG = "MessageBusModule"
    private const val COMPONENT_NAME = "AdyenMessageBus"
    var consumers: MutableMap<String, ComponentContract> = mutableMapOf()
    var currentComponent: String? = null
  }
}
