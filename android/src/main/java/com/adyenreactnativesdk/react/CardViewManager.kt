package com.adyenreactnativesdk.react

import android.util.Size
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutListener
import com.adyenreactnativesdk.react.card.CardComponentFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.ifNotNull
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableNativeMap
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.fabric.FabricUIManager
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.viewmanagers.CardViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerInterface
import org.json.JSONObject

@ReactModule(name = CardViewManager.NAME)
class CardViewManager :
  SimpleViewManager<DynamicComponentView>(),
  CardViewManagerInterface<DynamicComponentView>, LayoutListener {

  private val delegate: ViewManagerDelegate<DynamicComponentView> = CardViewManagerDelegate(this)
  private var dynamicComponentView: DynamicComponentView? = null
  private var cardComponent: CardComponent? = null
  private var configuration: CheckoutConfiguration? = null
  private var paymentMethod: JSONObject? = null
  private var fragmentActivity: FragmentActivity? = null
  private var stateWrapper: StateWrapper? = null

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    fragmentActivity = context.currentActivity as? FragmentActivity
    dynamicComponentView = DynamicComponentView(context)
    dynamicComponentView?.layoutListener = this

    return dynamicComponentView!!
  }

  override fun updateState(
    view: DynamicComponentView,
    props: ReactStylesDiffMap?,
    stateWrapper: StateWrapper?
  ): Any? {
    this.stateWrapper = stateWrapper
    return super.updateState(view, props, stateWrapper)
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)

    ifNotNull(
      paymentMethod,
      configuration,
      fragmentActivity
    ) { paymentMethodJson, configuration, fragmentActivity ->
      val cardComponent =
        CardComponentFactory.build(fragmentActivity, configuration, paymentMethodJson)
      dynamicComponentView?.addComponent(cardComponent, fragmentActivity)

      this.cardComponent = cardComponent

    }
  }

  override fun setPaymentMethod(
    view: DynamicComponentView?,
    value: String?
  ) {
    value?.let {
      paymentMethod = JSONObject(it)
    }
  }

  override fun setConfiguration(
    view: DynamicComponentView?,
    value: String?
  ) {
    value?.let {
      val json = JSONObject(it)
      val map = ReactNativeJson.convertJsonToMap(json)
      configuration = CheckoutConfigurationFactory.get(map)
    }
  }

  @ReactProp(name = "showButton", defaultBoolean = false)
  override fun setShowButton(
    view: DynamicComponentView?,
    value: Boolean,
  ) {
    // TODO: add removable button
  }

  companion object {
    const val NAME = "CardView"
  }

  private fun emitOnPressEvent(
    context: ReactContext,
    viewId: Int,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = OnPressEvent(surfaceId, viewId)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(OnPressEvent.EVENT_NAME to mapOf("registrationName" to "onButtonPress"))

  private fun onAction(action: Action) = ifNotNull(
    cardComponent,
    fragmentActivity
  ) { cardComponent, fragmentActivity ->
    cardComponent.handleAction(action, fragmentActivity)
  }

  override fun onLayoutSizeUpdate(size: Size) {
    val props = WritableNativeMap().apply {
      putDouble("width", size.width.toDouble())
      putDouble("height", size.height.toDouble())
    }

    stateWrapper?.updateState(props)
//    this.updateState(dynamicComponentView!!, ReactStylesDiffMap(props), stateWrapper)
  }

}
