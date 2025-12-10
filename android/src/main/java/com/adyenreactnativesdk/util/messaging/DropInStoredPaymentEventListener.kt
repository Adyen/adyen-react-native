package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod

interface DropInStoredPaymentEventListener {
  fun onRemove(storedPaymentMethod: StoredPaymentMethod)

  fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>)

  fun onOrderRequest()

  fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  )
}
