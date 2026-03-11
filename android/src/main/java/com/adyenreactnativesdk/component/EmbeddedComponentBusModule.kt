package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.dropin.AddressLookupDropInServiceResult
import com.adyenreactnativesdk.component.base.BaseAddressModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.embeddedComponentsEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class EmbeddedComponentBusModule(
  val context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseAddressModule(context, messageBus) {
  private var activeComponentType: String? = null
  private val subscribedTypes: MutableSet<String> = mutableSetOf()

  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = EventName.embeddedComponentsEvents()

  override fun getConstants(): MutableMap<String, Any> = super.getConstants()

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  @ReactMethod
  fun subscribe(componentType: String) {
    subscribedTypes.add(componentType)
  }

  @ReactMethod
  fun unsubscribe(componentType: String) {
    subscribedTypes.remove(componentType)
    consumers.remove(componentType)
    if (activeComponentType == componentType) {
      activeComponentType = null
    }
    if (subscribedTypes.isEmpty()) {
      cleanup()
    }
  }

  @ReactMethod
  fun confirm(
    componentType: String,
    success: Boolean,
    address: ReadableMap?,
  ) {
    activeComponentType = componentType
    super.confirm(success, address)
  }

  @ReactMethod
  fun update(
    componentType: String,
    array: ReadableArray?,
  ) {
    activeComponentType = componentType
    super.update(array)
  }

  @ReactMethod
  fun hide(
    componentType: String,
    success: Boolean,
    message: ReadableMap?,
  ) {
    consumers.remove(componentType)
    if (activeComponentType == componentType) {
      activeComponentType = null
    }
    if (consumers.isEmpty()) {
      activeComponentType = null
      cleanup()
    }
  }

  override fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) {
    activeComponentType = null
    cleanup()
  }

  @ReactMethod
  fun handle(
    componentType: String,
    actionMap: ReadableMap?,
  ) {
    activeComponentType = componentType
    super.parseAndHandleAction(actionMap)
  }

  override fun handleAction(action: Action) {
    val componentName =
      activeComponentType ?: return messageBus.onException(ModuleException.NoPaymentRegistered())

    val component =
      consumers[componentName]
        ?: return messageBus.onException(ModuleException.NoConsumer(componentName))

    try {
      component.onAction(action)
    } catch (e: JSONException) {
      messageBus.onException(ModuleException.InvalidAction(e))
    } finally {
      activeComponentType = null
    }
  }

  override fun sendAddressLookupResult(result: AddressLookupDropInServiceResult) {
    val componentType =
      activeComponentType ?: return messageBus.onException(ModuleException.NoPaymentRegistered())

    val component =
      consumers[componentType]
        ?: return messageBus.onException(ModuleException.NoConsumer(componentType))

    when (result) {
      is AddressLookupDropInServiceResult.LookupResult -> {
        component.onAddressLookupOptions(result.options)
      }

      is AddressLookupDropInServiceResult.LookupComplete -> {
        component.onAddressLookupResult(AddressLookupResult.Completed(result.lookupAddress))
      }

      is AddressLookupDropInServiceResult.Error -> {
        component.onAddressLookupResult(AddressLookupResult.Error(result.errorDialog?.message))
      }
    }
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenComponentBus"

    /** Registry of componentType → ViewManager implementing ComponentContract */
    var consumers: MutableMap<String, ComponentContract> = mutableMapOf()
  }
}
