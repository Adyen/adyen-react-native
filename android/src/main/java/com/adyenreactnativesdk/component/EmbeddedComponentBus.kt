package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.embeddedComponentsEvents
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class EmbeddedComponentBusModule(
  val context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseModule(context, messageBus) {
  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = EventName.embeddedComponentsEvents()

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("supportedEvents" to supportedEvents())

  @ReactMethod
  override fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) {
    cleanup()
  }

  @ReactMethod
  fun handle(actionMap: ReadableMap?) {
    val name =
      currentComponent ?: return messageBus.onException(ModuleException.NoPaymentRegistered())

    val component =
      consumers[name]
        ?: return messageBus.onException(ModuleException.NoConsumer(name))

    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action = Action.Companion.SERIALIZER.deserialize(jsonObject)
      component.onAction(action)
    } catch (e: JSONException) {
      messageBus.onException(ModuleException.InvalidAction(e))
    }
  }

  companion object {
    private const val TAG = "EmbeddedComponentBus"
    private const val COMPONENT_NAME = "AdyenComponentBus"
    var consumers: MutableMap<String, ComponentContract> = mutableMapOf()
    var currentComponent: String? = null
  }
}
