package com.adyenreactnativesdk.util.messaging

import com.adyenreactnativesdk.component.base.KnownException
import org.json.JSONArray
import org.json.JSONObject

/**
 * Wraps an [Emitter] (typically [MessageBusEmitter]) and injects a
 * `viewId` field into every emitted event payload.
 *
 * Used by embedded ViewManagers so the JS side can demux events
 * from multiple simultaneous embedded components.
 */
class TaggedEmitter(
  private val delegate: MessageBusEmitter,
  val viewId: String,
) : Emitter {
  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  ) {
    jsonObject.put(VIEW_ID_KEY, viewId)
    delegate.sendEvent(eventName, jsonObject)
  }

  override fun sendEvent(
    eventName: EventName,
    string: String,
  ) {
    val json =
      JSONObject().apply {
        put(VIEW_ID_KEY, viewId)
        put(VALUE_KEY, string)
      }
    delegate.sendEvent(eventName, json)
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  ) {
    val json =
      JSONObject().apply {
        put(VIEW_ID_KEY, viewId)
        put(DATA_KEY, jsonObject)
      }
    delegate.sendEvent(eventName, json)
  }

  override fun sendError(
    eventName: EventName,
    error: Exception,
  ) {
    val jsonObject =
      JSONObject().apply {
        put(MESSAGE_KEY, error.localizedMessage)
        error.cause?.let { put(REASON_KEY, it.localizedMessage) }
        (error as? KnownException)?.let {
          put(ERROR_CODE_KEY, it.code)
        }
        put(VIEW_ID_KEY, viewId)
      }
    delegate.sendEvent(eventName, jsonObject)
  }

  private companion object {
    private const val VIEW_ID_KEY = "viewId"
    private const val VALUE_KEY = "value"
    private const val DATA_KEY = "data"
    private const val MESSAGE_KEY = "message"
    private const val REASON_KEY = "reason"
    private const val ERROR_CODE_KEY = "errorCode"
  }
}
