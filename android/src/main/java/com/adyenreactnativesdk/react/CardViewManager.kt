package com.adyenreactnativesdk.react

import android.util.Log
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.ResizableCustomViewEvent
import com.adyenreactnativesdk.react.card.CardViewState
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerInterface
import org.json.JSONObject

@ReactModule(name = CardViewManager.NAME)
class CardViewManager(
  private val messageBusEmitter: MessageBusEmitter,
) : SimpleViewManager<DynamicComponentView>(),
  CardViewManagerInterface<DynamicComponentView> {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = CardViewManagerDelegate(this)
  private val viewStates = mutableMapOf<DynamicComponentView, CardViewState>()

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    val view = DynamicComponentView(context)
    val state = CardViewState(context, messageBusEmitter)
    view.layoutListener = state
    viewStates[view] = state
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    viewStates.remove(view)?.dispose(view)
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    if (view.isViewSet) return

    val state = viewStates[view] ?: return
    state.renderView(view)
  }

  override fun setPaymentMethod(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    if (value == null) {
      Log.e("CardViewManager", "paymentMethod value is null")
      return
    }
    val json = JSONObject(value)
    state.paymentMethod = json
  }

  override fun setConfiguration(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    if (value == null) {
      Log.e("CardViewManager", "configuration value is null")
      return
    }
    val json = JSONObject(value)
    val map = ReactNativeJson.convertJsonToMap(json)
    state.configuration = CheckoutConfigurationFactory.get(map)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(ResizableCustomViewEvent.EVENT_NAME to mapOf("registrationName" to "onResizableCustomView"))

  companion object {
    const val NAME = "CardView"
  }
}
