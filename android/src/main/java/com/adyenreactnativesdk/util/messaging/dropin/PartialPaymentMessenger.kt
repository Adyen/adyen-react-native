package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState

interface PartialPaymentMessenger {
  fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>)

  fun onOrderRequest()

  fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  )
}
