package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName

class RemoveStoredPaymentMessengerImpl(
  private val emitter: Emitter,
) : RemoveStoredPaymentMessenger {
  override fun onRemove(storedPaymentMethod: StoredPaymentMethod) {
    val jsonObject = StoredPaymentMethod.Companion.SERIALIZER.serialize(storedPaymentMethod)
    emitter.sendEvent(EventName.DISABLE_STORED_PAYMENT_METHOD, jsonObject)
  }
}
