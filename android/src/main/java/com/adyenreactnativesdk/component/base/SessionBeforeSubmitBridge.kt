/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.components.BeforeSubmitResult
import com.adyen.checkout.core.components.data.Address
import com.adyen.checkout.core.components.data.BeforeSubmitData
import com.adyen.checkout.core.components.data.ShopperName
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import kotlin.coroutines.resume

internal class SessionBeforeSubmitBridge(
  private val messageBus: MessageBus,
) {
  private var continuation: CancellableContinuation<BeforeSubmitResult>? = null

  suspend fun onBeforeSubmit(data: BeforeSubmitData): BeforeSubmitResult =
    suspendCancellableCoroutine { continuation ->
      check(this.continuation == null) { "A session before-submit callback is already pending." }
      this.continuation = continuation
      continuation.invokeOnCancellation { this.continuation = null }
      messageBus.onBeforeSubmit(data)
    }

  fun provide(result: ReadableMap?) {
    val continuation = continuation ?: return
    this.continuation = null
    val beforeSubmitResult =
      try {
        parse(result)
      } catch (e: Exception) {
        messageBus.onSessionException(e)
        BeforeSubmitResult.Abort()
      }
    continuation.resume(beforeSubmitResult)
  }

  fun cancel() {
    continuation?.let {
      continuation = null
      it.resume(BeforeSubmitResult.Abort())
    }
  }

  private fun parse(result: ReadableMap?): BeforeSubmitResult {
    val json = ReactNativeJson.convertMapToJson(result)
    return when (json.optString(TYPE_KEY)) {
      ABORT_TYPE -> {
        BeforeSubmitResult.Abort()
      }

      PROCEED_TYPE -> {
        BeforeSubmitResult.Proceed(
          data = parseData(json.optJSONObject(DATA_KEY) ?: throw IllegalArgumentException("Missing before-submit data.")),
          sessionData = json.optString(SESSION_DATA_KEY).takeIf { it.isNotEmpty() },
        )
      }

      else -> {
        throw IllegalArgumentException("Invalid before-submit result type.")
      }
    }
  }

  private fun parseData(data: JSONObject): BeforeSubmitData =
    BeforeSubmitData(
      billingAddress = data.optJSONObject(BILLING_ADDRESS_KEY)?.let(Address.SERIALIZER::deserialize),
      deliveryAddress = data.optJSONObject(DELIVERY_ADDRESS_KEY)?.let(Address.SERIALIZER::deserialize),
      shopperName = data.optJSONObject(SHOPPER_NAME_KEY)?.let(ShopperName.SERIALIZER::deserialize),
      shopperEmail = data.optString(SHOPPER_EMAIL_KEY).takeIf { it.isNotEmpty() },
    )

  private companion object {
    private const val TYPE_KEY = "type"
    private const val DATA_KEY = "data"
    private const val SESSION_DATA_KEY = "sessionData"
    private const val BILLING_ADDRESS_KEY = "billingAddress"
    private const val DELIVERY_ADDRESS_KEY = "deliveryAddress"
    private const val SHOPPER_NAME_KEY = "shopperName"
    private const val SHOPPER_EMAIL_KEY = "shopperEmail"
    private const val PROCEED_TYPE = "proceed"
    private const val ABORT_TYPE = "abort"
  }
}
