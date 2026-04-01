package com.adyenreactnativesdk.react.base

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

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
