package com.adyenreactnativesdk.component

import android.util.Log
import com.adyen.checkout.components.core.AddressLookupResult
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

class EmbeddedComponentBusModule(
  val context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseAddressModule(context, messageBus) {
  private val subscribedViews: MutableSet<String> = mutableSetOf()

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
  fun subscribe(viewId: String) {
    subscribedViews.add(viewId)
  }

  @ReactMethod
  fun unsubscribe(viewId: String) {
    subscribedViews.remove(viewId)
    Companion.unregister(viewId)
    if (subscribedViews.isEmpty()) {
      cleanup()
    }
  }

  @ReactMethod
  fun handle(
    viewId: String,
    actionMap: ReadableMap?,
  ) {
    val action =
      try {
        parseActionFromMap(actionMap)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to parse action", e)
        return sendError(e)
      }

    val consumer =
      getConsumer(viewId)
        ?: return sendError(ModuleException.NoConsumer(viewId))

    consumer.onAction(action)
  }

  @ReactMethod
  fun update(
    viewId: String,
    array: ReadableArray?,
  ) {
    val consumer =
      getConsumer(viewId)
        ?: return sendError(ModuleException.NoConsumer(viewId))

    consumer.onAddressLookupOptions(parseAddressOptions(array))
  }

  @ReactMethod
  fun confirm(
    viewId: String,
    success: Boolean,
    address: ReadableMap?,
  ) {
    val consumer =
      getConsumer(viewId)
        ?: return sendError(ModuleException.NoConsumer(viewId))

    if (success) {
      try {
        consumer.onAddressLookupResult(AddressLookupResult.Completed(parseLookupAddress(address)))
      } catch (e: Exception) {
        Log.w(TAG, "Failed to parse address lookup confirmation", e)
        consumer.onAddressLookupResult(AddressLookupResult.Error(e.localizedMessage))
      }
    } else {
      consumer.onAddressLookupResult(AddressLookupResult.Error(address?.getString("message")))
    }
  }

  @ReactMethod
  fun hide(
    viewId: String,
    success: Boolean,
    message: ReadableMap?,
  ) {
    Companion.unregister(viewId)
    if (subscribedViews.isEmpty()) {
      cleanup()
    }
  }

  override fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) {
    cleanup()
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenComponentBus"
    private const val TAG = "EmbeddedComponentBusModule"

    /** Registry of viewId (reactTag) → ViewState implementing ComponentContract */
    private val consumers: MutableMap<String, ComponentContract> = mutableMapOf()

    @Synchronized
    fun register(
      viewId: String,
      contract: ComponentContract,
    ) {
      consumers[viewId] = contract
    }

    @Synchronized
    fun unregister(viewId: String) {
      consumers.remove(viewId)
    }

    @Synchronized
    fun getConsumer(viewId: String): ComponentContract? = consumers[viewId]

    @Synchronized
    fun clearConsumers() = consumers.clear()
  }
}
