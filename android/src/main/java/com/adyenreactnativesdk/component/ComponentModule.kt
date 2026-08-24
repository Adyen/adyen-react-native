package com.adyenreactnativesdk.component

import android.util.Log
import com.adyenreactnativesdk.component.base.BaseActionModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.cardEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * Native module that relays JS commands to the per-view v6 [ComponentContract] of embedded
 * `<AdyenComponent>` views. `action` resumes an in-flight submission with a merchant
 * action; `completion` resolves it with a terminal result; `retry` re-prompts the shopper.
 * Address-lookup commands are accepted but inert until the v6 SDK exposes embedded address lookup.
 */
class ComponentModule(
  val context: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseActionModule(context, messageBus) {
  private val subscribedViews: MutableSet<String> = mutableSetOf()

  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = super.supportedEvents() + EventName.cardEvents()

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
    unregister(viewId)
  }

  @ReactMethod
  fun action(
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
    // TODO: v6 alpha - address lookup is not yet supported
  }

  @ReactMethod
  fun confirm(
    viewId: String,
    success: Boolean,
    address: ReadableMap?,
  ) {
    // TODO: v6 alpha - address lookup is not yet supported
  }

  @ReactMethod
  fun completion(
    viewId: String,
    resultCode: String,
  ) {
    // Terminal result for this view — the consumer finishes the flow and the view is
    // unregistered. Global cleanup happens when the TS-level terminal callback fires.
    getConsumer(viewId)?.onFinalResult(true, null)
    unregister(viewId)
  }

  @ReactMethod
  fun retry(
    viewId: String,
    message: String?,
  ) {
    // A retriable failure loops back into onSubmit as SubmitResult.Retry, so the consumer
    // reports whether it stayed in-flight. The view remains registered when retained.
    // Global cleanup happens when the TS-level terminal callback fires.
    val retained = getConsumer(viewId)?.onFinalResult(false, message) ?: false
    if (retained) return

    unregister(viewId)
  }

  fun completion(resultCode: String) {
    cleanup()
  }

  fun retry(message: String?) {
    cleanup()
  }

  companion object {
    private const val COMPONENT_NAME = "AdyenComponent"
    private const val TAG = "ComponentModule"

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
