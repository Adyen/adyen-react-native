package com.adyenreactnativesdk.component

import android.util.Log
import com.adyenreactnativesdk.component.base.BaseActionModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.cardEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

/**
 * Relays JS commands to the per-view [ComponentContract] of embedded `<AdyenComponent>` views.
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
    CheckoutCoordinator.shared.unregisterConsumer(viewId)
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
      CheckoutCoordinator.shared.consumer(viewId)
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
    // Terminal result for this view; global cleanup happens via the TS-level terminal callback.
    CheckoutCoordinator.shared.consumer(viewId)?.onFinalResult(true, null)
    CheckoutCoordinator.shared.unregisterConsumer(viewId)
  }

  @ReactMethod
  fun retry(
    viewId: String,
    message: String?,
  ) {
    // Retriable failure: consumer reports whether it stayed in-flight; view stays registered if so.
    val retained = CheckoutCoordinator.shared.consumer(viewId)?.onFinalResult(false, message) ?: false
    if (retained) return

    CheckoutCoordinator.shared.unregisterConsumer(viewId)
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
  }
}
