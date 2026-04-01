package com.adyenreactnativesdk.react

import android.util.Log
import android.util.Size
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.component.EmbeddedComponentBusModule
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutListener
import com.adyenreactnativesdk.react.card.CardComponentManager
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.ifNotNull
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.adyenreactnativesdk.util.messaging.TaggedEmitter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.CardViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerInterface
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Per-view state holder so that CardViewManager remains stateless. */
private class CardViewState(
  val view: DynamicComponentView,
  val context: ThemedReactContext,
) : LayoutListener, ComponentContract {
  var cardComponentManager: CardComponentManager? = null
  var configuration: CheckoutConfiguration? = null
  var paymentMethod: JSONObject? = null
  var componentType: String? = null

  override fun onLayoutSizeUpdate(size: Size) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
    val event = ResizableCustomViewEvent(surfaceId, view.id, size.width, size.height)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun onAction(action: Action) {
    cardComponentManager?.handleAction(action)
  }

  override fun onAddressLookupResult(result: AddressLookupResult) {
    cardComponentManager?.setAddressLookupResult(result)
  }

  override fun onAddressLookupOptions(options: List<LookupAddress>) {
    cardComponentManager?.updateAddressLookupOptions(options)
  }

  fun dispose() {
    componentType?.let { EmbeddedComponentBusModule.unregister(it) }
    view.onDispose()
    cardComponentManager = null
    configuration = null
    paymentMethod = null
    componentType = null
  }
}

@ReactModule(name = CardViewManager.NAME)
class CardViewManager(
  private val emitter: MessageBusEmitter,
) : SimpleViewManager<DynamicComponentView>(),
  CardViewManagerInterface<DynamicComponentView> {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = CardViewManagerDelegate(this)
  private val viewStates = mutableMapOf<DynamicComponentView, CardViewState>()

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    val view = DynamicComponentView(context)
    val state = CardViewState(view, context)
    view.layoutListener = state
    viewStates[view] = state
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    viewStates.remove(view)?.dispose()
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    if (view.viewSet) return

    val state = viewStates[view] ?: return
    val type = state.componentType
    if (type == null) {
      Log.e("CardViewManager", "Component type is null")
      return
    }

    val tagged = TaggedEmitter(emitter, type)
    val messageBus = MessageBus(tagged)
    ifNotNull(
      state.paymentMethod,
      state.configuration,
      state.context.currentActivity as? FragmentActivity,
    ) { paymentMethodJson, configuration, activity ->
      val manager = CardComponentManager(activity, messageBus)
      state.cardComponentManager = manager
      val component = manager.createComponent(configuration, paymentMethodJson)
      activity.lifecycleScope.launch {
        AdyenComponentView(activity).apply {
          attach(component, activity)
          view.setView(this)
        }
      }
    }
  }

  override fun setPaymentMethod(view: DynamicComponentView?, value: String?) {
    val state = view?.let { viewStates[it] } ?: return
    value?.let {
      val json = JSONObject(it)
      state.paymentMethod = json
      extractType(state, json)
    }
  }

  private fun extractType(state: CardViewState, json: JSONObject) {
    val type = json.optString("type", null)
    if (type != null && type != state.componentType) {
      state.componentType?.let { old -> EmbeddedComponentBusModule.unregister(old) }
      state.componentType = type
      EmbeddedComponentBusModule.register(type, state)
    }
  }

  override fun setConfiguration(view: DynamicComponentView?, value: String?) {
    val state = view?.let { viewStates[it] } ?: return
    value?.let {
      val json = JSONObject(it)
      val map = ReactNativeJson.convertJsonToMap(json)
      state.configuration = CheckoutConfigurationFactory.get(map)
    }
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(ResizableCustomViewEvent.EVENT_NAME to mapOf("registrationName" to "onResizableCustomView"))

  companion object {
    const val NAME = "CardView"
  }
}

class ResizableCustomViewEvent(
  surfaceId: Int,
  viewId: Int,
  private val width: Int,
  private val height: Int,
) : Event<ResizableCustomViewEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME
  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putInt("width", width)
      putInt("height", height)
    }
  companion object {
    const val EVENT_NAME: String = "onLayoutChange"
  }
}
