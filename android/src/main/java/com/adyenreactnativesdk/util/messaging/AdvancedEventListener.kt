package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.exception.CheckoutException

interface AdvancedEventListener {
  fun onSubmit(
    state: PaymentComponentState<*>,
    returnUrl: String?,
  )

  fun onAdditionalDetails(actionComponentData: ActionComponentData)

  fun onException(exception: Exception)

  fun onFinished()
}
