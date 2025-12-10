package com.adyenreactnativesdk.component.model

import com.adyen.checkout.components.core.Order
import org.json.JSONObject

fun Order.toJSONObject(shouldUpdatePaymentMethods: Boolean): JSONObject =
  JSONObject().apply {
    put("order", Order.SERIALIZER.serialize(this@toJSONObject))
    put("shouldUpdatePaymentMethods", shouldUpdatePaymentMethods)
  }
