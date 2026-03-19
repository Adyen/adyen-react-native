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

@ReactModule(name = CardViewManager.NAME)
class CardViewManager(
  private val emitter: MessageBusEmitter,
) : SimpleViewManager<DynamicComponentView>(),
  CardViewManagerInterface<DynamicComponentView>,
  LayoutListener,
  ComponentContract {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = CardViewManagerDelegate(this)
  private var persistedView: DynamicComponentView? = null
  private var cardComponentManager: CardComponentManager? = null
  private var configuration: CheckoutConfiguration? = null
  private var paymentMethod: JSONObject? = null
  private var context: ThemedReactContext? = null
  private var componentType: String? = null
  private var taggedEmitter: TaggedEmitter? = null

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    this.context = context
    if (persistedView != null) {
      persistedView?.onDispose()
    }
    val view = DynamicComponentView(context)
    view.layoutListener = this
    persistedView = view
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    // Ensure proper cleanup when view is dropped
    view.onDispose()
    if (view == persistedView) {
      componentType?.let { EmbeddedComponentBusModule.consumers.remove(it) }
      persistedView = null
      cardComponentManager = null
      context = null
      componentType = null
      taggedEmitter = null
    }
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    if (view.viewSet) {
      return
    }
    val type = componentType
    if (type == null) {
      Log.e("CardViewManager", "Component type is null")
      return
    }

    val tagged = TaggedEmitter(emitter, type)
    val messageBus = MessageBus(tagged)
    ifNotNull(
      paymentMethod,
      configuration,
      context?.currentActivity as? FragmentActivity,
    ) { paymentMethodJson, configuration, activity ->
      val manager = CardComponentManager(activity, messageBus)
      cardComponentManager = manager
      val component = manager.createComponent(configuration, paymentMethodJson)
      activity.lifecycleScope.launch {
        AdyenComponentView(activity).apply {
          attach(component, activity)
          view.setView(this)
        }
      }
    }
  }

  override fun setPaymentMethod(
    view: DynamicComponentView?,
    value: String?,
  ) {
    value?.let {
      val json = JSONObject(it)
      paymentMethod = json
      extractType(json)
    }
  }

  private fun extractType(json: JSONObject) {
    val type = json.optString("type", null)
    if (type != null && type != componentType) {
      componentType?.let { old -> EmbeddedComponentBusModule.consumers.remove(old) }
      componentType = type
      EmbeddedComponentBusModule.consumers[type] = this
    }
  }

  override fun setConfiguration(
    view: DynamicComponentView?,
    value: String?,
  ) {
    value?.let {
      val json = JSONObject(it)
      val map = ReactNativeJson.convertJsonToMap(json)
      configuration = CheckoutConfigurationFactory.get(map)
    }
  }

  companion object {
    const val NAME = "CardView"
  }

  private fun emitResizableCustomViewEvent(
    context: ReactContext,
    viewId: Int,
    width: Int,
    height: Int,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = ResizableCustomViewEvent(surfaceId, viewId, width, height)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(
      ResizableCustomViewEvent.EVENT_NAME to mapOf("registrationName" to "onResizableCustomView"),
    )

  override fun onLayoutSizeUpdate(size: Size) {
    ifNotNull(context, persistedView) { context, view ->
      emitResizableCustomViewEvent(context, view.id, size.width, size.height)
    }
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

interface ComponentContract {
  fun onAction(action: Action)

  fun onAddressLookupResult(result: AddressLookupResult)

  fun onAddressLookupOptions(options: List<LookupAddress>)
}
