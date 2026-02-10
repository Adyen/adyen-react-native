package com.adyenreactnativesdk.util.messaging

import org.json.JSONArray
import org.json.JSONObject

interface Emitter {
  fun sendError(
    eventName: EventName,
    error: Exception,
  )

  fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  )

  fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  )

  fun sendEvent(
    eventName: EventName,
    string: String,
  )
}
