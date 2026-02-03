package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentState

interface AdvancedMessenger {
  fun onSubmit(
    state: PaymentComponentState<*>,
    returnUrl: String?,
  )

  fun onAdditionalDetails(actionComponentData: ActionComponentData)

  fun onException(exception: Exception)

  fun onFinished()
}
