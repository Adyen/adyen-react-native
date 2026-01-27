package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.component.model.toJSONObject
import com.adyenreactnativesdk.util.ResultCodes

class SessionEventListenerImpl(
  private val emitter: MessageBusEmitter,
) : SessionEventListener {
  override fun onSessionException(exception: Exception) {
    emitter.sendError(EventName.SESSION_ERROR, exception)
  }

  override fun onFinished(result: SessionPaymentResult) {
    val updatedResult =
      when (result.resultCode) {
        VOUCHER_RESULT_CODE -> result.copy(resultCode = ResultCodes.PRESENT_TO_SHOPPER.value)
        else -> result
      }
    emitter.sendEvent(EventName.COMPLETE_SESSION, updatedResult.toJSONObject())
  }

  private companion object {
    private const val VOUCHER_RESULT_CODE = "finish_with_action"
  }
}
