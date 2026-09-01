package com.adyenreactnativesdk.util.messaging

import com.adyenreactnativesdk.component.base.KnownException
import org.json.JSONArray
import org.json.JSONObject

/**
 * Wraps an [Emitter] and stamps every emitted payload with a tag identifying who produced it.
 *
 * Event names are delivered globally through `RCTDeviceEventEmitter`, so a per-module emitter does
 * not isolate delivery — attribution has to travel inside the payload. JS reads the tag to route a
 * result back to the presenter that is actually awaiting it.
 *
 * Use the [forView] / [forSource] factories rather than the constructor; they differ in how scalar
 * payloads are treated, which is deliberate — see [wrapsScalars].
 */
class TaggedEmitter private constructor(
  private val delegate: Emitter,
  private val tagKey: String,
  private val tagValue: String,
  /**
   * Whether `String` / `JSONArray` payloads are boxed into an object so they can carry the tag.
   *
   * Only the view tag does this: JS unwraps `{viewId, value}` / `{viewId, data}` in embedded mode
   * and nowhere else. Boxing them for a source tag would reshape `onBinValue` and address-lookup
   * payloads that JS reads directly, so [forSource] passes scalars through untouched and simply
   * leaves them untagged.
   */
  private val wrapsScalars: Boolean,
) : Emitter {
  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONObject,
  ) {
    jsonObject.put(tagKey, tagValue)
    delegate.sendEvent(eventName, jsonObject)
  }

  override fun sendEvent(
    eventName: EventName,
    string: String,
  ) {
    if (!wrapsScalars) {
      delegate.sendEvent(eventName, string)
      return
    }
    val json =
      JSONObject().apply {
        put(tagKey, tagValue)
        put(VALUE_KEY, string)
      }
    delegate.sendEvent(eventName, json)
  }

  override fun sendEvent(
    eventName: EventName,
    jsonObject: JSONArray,
  ) {
    if (!wrapsScalars) {
      delegate.sendEvent(eventName, jsonObject)
      return
    }
    val json =
      JSONObject().apply {
        put(tagKey, tagValue)
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
        put(tagKey, tagValue)
      }
    delegate.sendEvent(eventName, jsonObject)
  }

  companion object {
    private const val VIEW_ID_KEY = "viewId"
    private const val SOURCE_KEY = "source"
    private const val VALUE_KEY = "value"
    private const val DATA_KEY = "data"
    private const val MESSAGE_KEY = "message"
    private const val REASON_KEY = "reason"
    private const val ERROR_CODE_KEY = "errorCode"

    /**
     * Tags events with the emitting view's `viewId` so JS can demux several simultaneous embedded
     * `<AdyenComponent>` views. Boxes scalar payloads, which JS unwraps in embedded mode.
     */
    fun forView(
      delegate: Emitter,
      viewId: String,
    ): TaggedEmitter = TaggedEmitter(delegate, VIEW_ID_KEY, viewId, wrapsScalars = true)

    /**
     * Tags events with the presenter that produced them (see [EventSource]) so JS can route a
     * result back to the right native module. Leaves scalar payloads untouched.
     */
    fun forSource(
      delegate: Emitter,
      source: String,
    ): TaggedEmitter = TaggedEmitter(delegate, SOURCE_KEY, source, wrapsScalars = false)
  }
}
