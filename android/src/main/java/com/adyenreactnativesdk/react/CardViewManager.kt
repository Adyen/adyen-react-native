package com.adyenreactnativesdk.react

import com.facebook.react.bridge.ReactContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.CardViewManagerDelegate
import com.facebook.react.viewmanagers.CardViewManagerInterface
import com.google.android.gms.wallet.button.ButtonConstants

@ReactModule(name = CardViewManager.NAME)
class CardViewManager :
  SimpleViewManager<CardView>(),
  CardViewManagerInterface<CardView> {
  private val delegate: ViewManagerDelegate<CardView> = CardViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<CardView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): CardView =
    CardView(context).apply {
      onClick = {
        emitOnPressEvent(context, id)
      }
    }

  override fun onAfterUpdateTransaction(view: CardView) {
    super.onAfterUpdateTransaction(view)
    view.showButton()
  }

  @ReactProp(name = "showButton", defaultInt = false)
  override fun setShowButton(
    view: CardView?,
    value: Boolean,
  ) {
    // view?.radius = PixelUtil.toPixelFromDIP(value.toDouble()).toInt()
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
}

class OnPressEvent(
  surfaceId: Int,
  viewId: Int,
) : Event<OnPressEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  companion object {
    const val EVENT_NAME: String = "onButtonPress"
  }
}
