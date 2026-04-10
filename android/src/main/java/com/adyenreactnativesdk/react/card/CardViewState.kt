package com.adyenreactnativesdk.react.card

import android.util.Size
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.component.EmbeddedComponentBusModule
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutChangeEvent
import com.adyenreactnativesdk.react.base.LayoutListener
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.adyenreactnativesdk.util.messaging.TaggedEmitter
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import org.json.JSONObject

class CardViewState(
  val context: ThemedReactContext,
  val emitter: MessageBusEmitter,
) : LayoutListener,
  ComponentContract {
  var configuration: CheckoutConfiguration? = null
  var paymentMethod: JSONObject? = null
  val activity: FragmentActivity =
    context.currentActivity as? FragmentActivity
      ?: throw IllegalStateException("CardView requires a FragmentActivity")
  private var componentManager: CardComponentManager? = null

  fun renderView(dynamicComponentView: DynamicComponentView) {
    val paymentMethodJson = paymentMethod ?: return
    val checkedConfig = configuration ?: return

    val viewId = dynamicComponentView.id.toString()
    val manager = CardComponentManager(activity, MessageBus(TaggedEmitter(emitter, viewId)))
    componentManager = manager

    val component = manager.createComponent(checkedConfig, paymentMethodJson)
    EmbeddedComponentBusModule.register(viewId, this)
    AdyenComponentView(activity).apply {
      attach(component, activity)
      dynamicComponentView.setView(this)
    }
  }

  override fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = LayoutChangeEvent(surfaceId, viewId, size.width, size.height)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun onAction(action: Action) {
    componentManager?.handleAction(action)
  }

  override fun onAddressLookupResult(result: AddressLookupResult) {
    componentManager?.setAddressLookupResult(result)
  }

  override fun onAddressLookupOptions(options: List<LookupAddress>) {
    componentManager?.updateAddressLookupOptions(options)
  }

  fun dispose(dynamicComponentView: DynamicComponentView) {
    dynamicComponentView.onDispose()
    configuration = null
    paymentMethod = null
    EmbeddedComponentBusModule.unregister(dynamicComponentView.id.toString())
    componentManager = null
  }
}
