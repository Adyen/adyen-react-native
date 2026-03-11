package com.adyenreactnativesdk.util.messaging

import org.json.JSONArray
import org.json.JSONObject

/**
 * Wraps an [Emitter] (typically [MessageBusEmitter]) and injects a
 * `componentType` field into every emitted event payload.
 *
 * Used by embedded ViewManagers so the JS side can demux events
 * from multiple simultaneous embedded components.
 */
class TaggedEmitter(
  private val delegate: MessageBusEmitter,
  val componentType: String,
) : Emitter {
  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  ) {
    jsonObject.put(COMPONENT_TYPE_KEY, componentType)
    delegate.sendEvent(eventName, jsonObject)
  }

  override fun sendEvent(
    eventName: EventName,
    string: String,
  ) {
    val json =
      JSONObject().apply {
        put(COMPONENT_TYPE_KEY, componentType)
        put("value", string)
      }
    delegate.sendEvent(eventName, json)
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  ) {
    val json =
      JSONObject().apply {
        put(COMPONENT_TYPE_KEY, componentType)
        put("data", jsonObject)
      }
    delegate.sendEvent(eventName, json)
  }

  override fun sendError(
    eventName: EventName,
    error: Exception,
  ) {
    val jsonObject =
      JSONObject().apply {
        put("message", error.localizedMessage)
        error.cause?.let { put("reason", it.localizedMessage) }
        (error as? com.adyenreactnativesdk.component.base.KnownException)?.let {
          put("errorCode", it.code)
        }
        put(COMPONENT_TYPE_KEY, componentType)
      }
    delegate.sendEvent(eventName, jsonObject)
  }

  private companion object {
    private const val COMPONENT_TYPE_KEY = "componentType"
  }
}
