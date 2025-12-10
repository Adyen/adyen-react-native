package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.sessions.core.SessionPaymentResult

interface ComponentEventListener {
  fun onSubmit(
    state: PaymentComponentState<*>,
    returnUrl: String?,
  )

  fun onAdditionalDetails(actionComponentData: ActionComponentData)

  fun onException(exception: CheckoutException)

  fun onFinished(result: SessionPaymentResult)
}
