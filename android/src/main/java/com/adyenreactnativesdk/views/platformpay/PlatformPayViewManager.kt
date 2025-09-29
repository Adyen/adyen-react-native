package com.adyenreactnativesdk.views.platformpay

import com.facebook.react.bridge.ReactContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.PlatformPayViewManagerDelegate
import com.facebook.react.viewmanagers.PlatformPayViewManagerInterface
import com.google.android.gms.wallet.button.ButtonConstants


@ReactModule(name = PlatformPayViewManager.NAME)
class PlatformPayViewManager : SimpleViewManager<PlatformPayView>(),
  PlatformPayViewManagerInterface<PlatformPayView> {
  private val delegate: ViewManagerDelegate<PlatformPayView> = PlatformPayViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<PlatformPayView> = delegate

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): PlatformPayView =
    PlatformPayView(context).apply {
      onClick = {
        emitOnPressEvent(context, id)
      }
    }

  override fun onAfterUpdateTransaction(view: PlatformPayView) {
    super.onAfterUpdateTransaction(view)
    view.showButton()
  }

  @ReactProp(name = "theme", defaultInt = ButtonConstants.ButtonTheme.DARK)
  override fun setTheme(view: PlatformPayView?, value: Int) {
    view?.theme = ButtonTheme.fromInt(value)
  }

  @ReactProp(name = "type", defaultInt = ButtonConstants.ButtonType.BUY)
  override fun setType(view: PlatformPayView?, value: Int) {
    view?.type = ButtonType.fromInt(value)
  }

  @ReactProp(name = "radius", defaultInt = 10)
  override fun setRadius(view: PlatformPayView?, value: Int) {
    view?.radius = PixelUtil.toPixelFromDIP(value.toDouble()).toInt()
  }

  companion object {
    const val NAME = "PlatformPayView"
  }

  private fun emitOnPressEvent(context: ReactContext, viewId: Int) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = OnPressEvent(surfaceId, viewId)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
    return mapOf(OnPressEvent.EVENT_NAME to mapOf("registrationName" to "onButtonPress"))
  }
}

class OnPressEvent(
  surfaceId: Int,
  viewId: Int
) : Event<OnPressEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  companion object {
    const val EVENT_NAME: String = "onButtonPress"
  }
}
