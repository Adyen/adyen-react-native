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
  private var activeViewId: String? = null
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
  fun confirm(
    viewId: String,
    success: Boolean,
    address: ReadableMap?,
  ) {
    activeViewId = viewId
    super.confirm(success, address)
  }

  @ReactMethod
  fun update(
    viewId: String,
    array: ReadableArray?,
  ) {
    activeViewId = viewId
    super.update(array)
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
    activeViewId = null
    cleanup()
  }

  @ReactMethod
  fun handle(
    viewId: String,
    actionMap: ReadableMap?,
  ) {
    activeViewId = viewId
    super.parseAndHandleAction(actionMap)
  }

  override fun handleAction(action: Action) {
    val viewId =
      activeViewId ?: return messageBus.onException(ModuleException.NoPaymentRegistered())

    val component =
      getConsumer(viewId)
        ?: return messageBus.onException(ModuleException.NoConsumer(viewId))

    try {
      component.onAction(action)
    } catch (e: JSONException) {
      messageBus.onException(ModuleException.InvalidAction(e))
    } finally {
      activeViewId = null
    }
  }

  override fun sendAddressLookupResult(result: AddressLookupDropInServiceResult) {
    val viewId =
      activeViewId ?: return messageBus.onException(ModuleException.NoPaymentRegistered())

    val contract =
      getConsumer(viewId)
        ?: return messageBus.onException(ModuleException.NoConsumer(viewId))

    try {
      when (result) {
        is AddressLookupDropInServiceResult.LookupResult -> {
          contract.onAddressLookupOptions(result.options)
        }

        is AddressLookupDropInServiceResult.LookupComplete -> {
          contract.onAddressLookupResult(AddressLookupResult.Completed(result.lookupAddress))
        }

        is AddressLookupDropInServiceResult.Error -> {
          contract.onAddressLookupResult(AddressLookupResult.Error(result.errorDialog?.message))
        }
      }
    } finally {
      if (result !is AddressLookupDropInServiceResult.LookupResult) {
        activeViewId = null
      }
    }
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenComponentBus"

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
