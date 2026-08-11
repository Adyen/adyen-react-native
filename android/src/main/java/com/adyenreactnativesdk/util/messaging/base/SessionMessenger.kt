package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.components.SessionCheckoutResult

interface SessionMessenger {
  fun onSessionException(exception: Exception)

  fun onFinished(result: SessionCheckoutResult)
}
