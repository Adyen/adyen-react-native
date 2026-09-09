package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.Address
import com.adyen.checkout.core.components.data.BeforeSubmitData
import com.adyen.checkout.core.components.data.ShopperName
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

  override fun onBeforeSubmit(data: BeforeSubmitData) {
    val jsonObject =
      JSONObject().apply {
        putOpt(BILLING_ADDRESS_KEY, data.billingAddress?.let(Address.SERIALIZER::serialize))
        putOpt(DELIVERY_ADDRESS_KEY, data.deliveryAddress?.let(Address.SERIALIZER::serialize))
        putOpt(SHOPPER_NAME_KEY, data.shopperName?.let(ShopperName.SERIALIZER::serialize))
        putOpt(SHOPPER_EMAIL_KEY, data.shopperEmail)
      }
    emitter.sendEvent(EventName.BEFORE_SUBMIT, jsonObject)
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
    private const val BILLING_ADDRESS_KEY = "billingAddress"
    private const val DELIVERY_ADDRESS_KEY = "deliveryAddress"
    private const val SHOPPER_NAME_KEY = "shopperName"
    private const val SHOPPER_EMAIL_KEY = "shopperEmail"
    private const val RESULT_CODE_KEY = "resultCode"
    private const val SESSION_ID_KEY = "sessionId"
    private const val SESSION_DATA_KEY = "sessionData"
  }
}
