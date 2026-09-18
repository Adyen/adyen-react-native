package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.BeforeSubmitData

interface SessionMessenger {
  fun onSessionException(exception: Exception)

  fun onFinished(result: SessionCheckoutResult)

  fun onBeforeSubmit(data: BeforeSubmitData)
}
