package com.adyenreactnativesdk.util.messaging

import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

class MessageBusEmitter(
  private val context: ReactContext,
) : Emitter {
  override fun sendError(
    eventName: EventName,
    error: Exception,
  ) {
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName.value, ReactNativeError.mapError(error))
  }

  fun send(
    eventName: EventName,
    payload: Any?,
  ) {
    try {
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName.value, payload)
    } catch (e: JSONException) {
      sendError(EventName.ERROR, e)
    }
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  ) {
    val payload = ReactNativeJson.convertJsonToMap(jsonObject)
    send(eventName, payload)
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  ) {
    val payload = ReactNativeJson.convertJsonToArray(jsonObject)
    send(eventName, payload)
  }

  override fun sendEvent(
    eventName: EventName,
    string: String,
  ) {
    send(eventName, string)
  }
}
