package com.adyenreactnativesdk.react.base

import com.facebook.react.uimanager.events.Event

class OnPressEvent(
  surfaceId: Int,
  viewId: Int,
) : Event<OnPressEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  companion object {
    const val EVENT_NAME: String = "onButtonPress"
  }
}
