package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyenreactnativesdk.component.model.toJSONObject
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName
import org.json.JSONObject

class PartialPaymentMessengerImpl(
  private val emitter: Emitter,
) : PartialPaymentMessenger {
  override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
    val jsonObject = PaymentComponentData.Companion.SERIALIZER.serialize(paymentComponentState.data)
    emitter.sendEvent(EventName.CHECK_BALANCE, jsonObject)
  }

  override fun onOrderRequest() {
    emitter.sendEvent(EventName.REQUEST_ORDER, JSONObject())
  }

  override fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  ) {
    emitter.sendEvent(EventName.CANCEL_ORDER, order.toJSONObject(shouldUpdatePaymentMethods))
  }
}
