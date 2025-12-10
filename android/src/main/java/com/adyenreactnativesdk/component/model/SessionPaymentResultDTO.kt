package com.adyenreactnativesdk.component.model

import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.sessions.core.SessionPaymentResult
import org.json.JSONObject

fun SessionPaymentResult.toJSONObject(): JSONObject =
  JSONObject().apply {
    put("resultCode", resultCode)
    put("order", order?.let { OrderResponse.Companion.SERIALIZER.serialize(it) })
    put("sessionResult", sessionResult)
    put("sessionData", sessionData)
    put("sessionId", sessionId)
  }
