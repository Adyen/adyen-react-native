package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyenreactnativesdk.component.model.toJSONObject
import org.json.JSONObject

class DropInStoredPaymentEventListenerImpl(
  private val emitter: MessageBusEmitter,
) : DropInStoredPaymentEventListener {
  override fun onRemove(storedPaymentMethod: StoredPaymentMethod) {
    val jsonObject = StoredPaymentMethod.Companion.SERIALIZER.serialize(storedPaymentMethod)
    emitter.sendEvent(EventName.DISABLE_STORED_PAYMENT_METHOD, jsonObject)
  }

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
