package com.adyenreactnativesdk.react

import android.util.Size
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.AdyenCheckout
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
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.CardViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerInterface
import org.json.JSONObject

@ReactModule(name = CardViewManager.NAME)
class CardViewManager(
  private val emitter: MessageBusEmitter,
) : SimpleViewManager<DynamicComponentView>(),
  CardViewManagerInterface<DynamicComponentView>,
  LayoutListener,
  ComponentContract {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = CardViewManagerDelegate(this)
  private var dynamicComponentView: DynamicComponentView? = null
  private var cardComponentManager: CardComponentManager? = null
  private var configuration: CheckoutConfiguration? = null
  private var paymentMethod: JSONObject? = null
  private var fragmentActivity: FragmentActivity? = null
  private var stateWrapper: StateWrapper? = null
  private var componentType: String? = null
  private var taggedEmitter: TaggedEmitter? = null

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    fragmentActivity = context.currentActivity as? FragmentActivity
    if (dynamicComponentView != null) {
      dynamicComponentView?.onDispose()
    }
    val view = DynamicComponentView(context)
    view.layoutListener = this
    dynamicComponentView = view
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    // Ensure proper cleanup when view is dropped
    view.onDispose()
    if (view == dynamicComponentView) {
      componentType?.let { EmbeddedComponentBusModule.consumers.remove(it) }
      dynamicComponentView = null
      cardComponentManager = null
      fragmentActivity = null
      componentType = null
      taggedEmitter = null
    }
  }

  override fun updateState(
    view: DynamicComponentView,
    props: ReactStylesDiffMap?,
    stateWrapper: StateWrapper?,
  ): Any? {
    this.stateWrapper = stateWrapper
    return super.updateState(view, props, stateWrapper)
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    if (dynamicComponentView?.hasComponent == true) {
      return
    }
    ifNotNull(
      paymentMethod,
      configuration,
      fragmentActivity,
    ) { paymentMethodJson, configuration, fragmentActivity ->
      // Check if FragmentActivity is still valid and not destroyed
      if (!fragmentActivity.isDestroyed && !fragmentActivity.isFinishing) {
        cardComponentManager?.init(configuration, paymentMethodJson)
        cardComponentManager?.component?.let { cardComponent ->
          dynamicComponentView?.addComponent(cardComponent, fragmentActivity)
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
      val type = json.optString("type", null)
      if (type != null && type != componentType) {
        componentType?.let { old -> EmbeddedComponentBusModule.consumers.remove(old) }
        componentType = type
        val tagged = TaggedEmitter(emitter, type)
        taggedEmitter = tagged
        cardComponentManager = view?.context?.let { ctx ->
          CardComponentManager(ctx as ThemedReactContext, MessageBus(tagged))
        }
        EmbeddedComponentBusModule.consumers[type] = this
      }
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
      OnPressEvent.EVENT_NAME to mapOf("registrationName" to "onButtonPress"),
      ResizableCustomViewEvent.EVENT_NAME to mapOf("registrationName" to "onResizableCustomView"),
    )

  override fun onLayoutSizeUpdate(size: Size) {
    dynamicComponentView?.let { view ->
      val context = view.context as? ReactContext
      context?.let {
        emitResizableCustomViewEvent(it, view.id, size.width, size.height)
      }
    }
  }

  override fun onAction(action: Action) {
    ifNotNull(
      fragmentActivity,
      cardComponentManager?.component,
    ) { activity, component ->
      // Check if FragmentActivity is still valid before handling action
      if (!activity.isDestroyed && !activity.isFinishing) {
        AdyenCheckout.setComponent(component)
        component.handleAction(action, activity)
      }
    }
  }

  override fun onAddressLookupResult(result: AddressLookupResult) {
    cardComponentManager?.component?.setAddressLookupResult(result)
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
