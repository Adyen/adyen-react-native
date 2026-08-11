package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyenreactnativesdk.util.ResultCodes
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName
import org.json.JSONObject

class SessionMessengerImpl(
  private val emitter: Emitter,
) : SessionMessenger {
  override fun onSessionException(exception: Exception) {
    emitter.sendError(EventName.SESSION_ERROR, exception)
  }

  override fun onFinished(result: SessionCheckoutResult) {
    val resultCode =
      when (result.resultCode.value) {
        VOUCHER_RESULT_CODE -> ResultCodes.PRESENT_TO_SHOPPER.value
        else -> result.resultCode.value
      }
    val jsonObject =
      JSONObject().apply {
        put(RESULT_CODE_KEY, resultCode)
        put(SESSION_ID_KEY, result.sessionId)
        put(SESSION_DATA_KEY, result.sessionData)
      }
    emitter.sendEvent(EventName.COMPLETE_SESSION, jsonObject)
  }

  private companion object {
    private const val VOUCHER_RESULT_CODE = "finish_with_action"
    private const val RESULT_CODE_KEY = "resultCode"
    private const val SESSION_ID_KEY = "sessionId"
    private const val SESSION_DATA_KEY = "sessionData"
  }
}
