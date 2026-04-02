package com.adyenreactnativesdk.react.card

import android.util.Size
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.component.EmbeddedComponentBusModule
import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutListener
import com.adyenreactnativesdk.react.base.ResizableCustomViewEvent
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.adyenreactnativesdk.util.messaging.TaggedEmitter
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import kotlinx.coroutines.launch
import org.json.JSONObject

class CardViewState(
  val context: ThemedReactContext,
  val emitter: MessageBusEmitter,
) : LayoutListener,
  ComponentContract {
  var configuration: CheckoutConfiguration? = null
  var paymentMethod: JSONObject? = null
  val activity: FragmentActivity = context.currentActivity as FragmentActivity
  val componentManager = CardComponentManager(activity, MessageBus(TaggedEmitter(emitter, TYPE)))

  fun renderView(dynamicComponentView: DynamicComponentView) {
    val paymentMethodJson = paymentMethod ?: return
    val checkedConfig = configuration ?: return

    val component = componentManager.createComponent(checkedConfig, paymentMethodJson)
    EmbeddedComponentBusModule.register(TYPE, this)
    activity.lifecycleScope.launch {
      AdyenComponentView(activity).apply {
        attach(component, activity)
        dynamicComponentView.setView(this)
      }
    }
  }

  override fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = ResizableCustomViewEvent(surfaceId, viewId, size.width, size.height)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun onAction(action: Action) {
    componentManager.handleAction(action)
  }

  override fun onAddressLookupResult(result: AddressLookupResult) {
    componentManager.setAddressLookupResult(result)
  }

  override fun onAddressLookupOptions(options: List<LookupAddress>) {
    componentManager.updateAddressLookupOptions(options)
  }

  fun dispose(dynamicComponentView: DynamicComponentView) {
    dynamicComponentView.onDispose()
    configuration = null
    paymentMethod = null
    EmbeddedComponentBusModule.unregister(TYPE)
  }

  companion object {
    const val TYPE = "scheme"
  }
}
