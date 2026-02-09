package com.adyenreactnativesdk.component.model

import com.adyen.checkout.components.core.Order
import org.json.JSONObject

data class OrderDTO(
  val order: Order,
  val shouldUpdatePaymentMethods: Boolean,
) {
  fun toJSONObject(): JSONObject =
    JSONObject().apply {
      put("order", Order.SERIALIZER.serialize(order))
      put("shouldUpdatePaymentMethods", shouldUpdatePaymentMethods)
    }
}
