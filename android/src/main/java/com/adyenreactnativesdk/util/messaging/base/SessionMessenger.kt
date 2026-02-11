package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.sessions.core.SessionPaymentResult

interface SessionMessenger {
  fun onSessionException(exception: Exception)

  fun onFinished(result: SessionPaymentResult)
}
