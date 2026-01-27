package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.sessions.core.SessionPaymentResult

interface SessionEventListener {
  fun onSessionException(exception: Exception)

  fun onFinished(result: SessionPaymentResult)
}
