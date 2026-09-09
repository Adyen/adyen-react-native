package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.components.data.PaymentComponentData

interface AdvancedMessenger {
  fun onSubmit(data: PaymentComponentData<*>)

  fun onAdditionalDetails(data: ActionComponentData)

  fun onException(exception: Exception)

  fun onFinished()

  fun onFinished(resultCode: String)
}
