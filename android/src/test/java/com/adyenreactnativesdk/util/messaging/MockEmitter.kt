/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging

import org.json.JSONArray
import org.json.JSONObject

class MockEmitter : Emitter {
  data class Event(
    val eventName: EventName,
    val payload: Any?,
  )

  data class ErrorEvent(
    val eventName: EventName,
    val error: Exception,
  )

  val events = mutableListOf<Event>()
  val errors = mutableListOf<ErrorEvent>()

  override fun sendError(
    eventName: EventName,
    error: Exception,
  ) {
    errors.add(ErrorEvent(eventName, error))
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  ) {
    events.add(Event(eventName, jsonObject))
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  ) {
    events.add(Event(eventName, jsonObject))
  }

  override fun sendEvent(
    eventName: EventName,
    string: String,
  ) {
    events.add(Event(eventName, string))
  }

  fun clear() {
    events.clear()
    errors.clear()
  }
}
