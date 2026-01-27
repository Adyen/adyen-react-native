package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyenreactnativesdk.component.model.ResponseDTO
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ResultCodes
import org.json.JSONObject

class AdvancedEventListenerImpl(
  private val emitter: MessageBusEmitter,
) : AdvancedEventListener {
  override fun onSubmit(
    state: PaymentComponentState<*>,
    returnUrl: String?,
  ) {
    val extra =
      if (state is GooglePayComponentState) {
        state.paymentData?.let {
          JSONObject(it.toJson())
        }
      } else {
        null
      }

    val jsonObject = PaymentComponentData.Companion.SERIALIZER.serialize(state.data)
    returnUrl?.let {
      jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, it)
    }

    val submitMap = SubmitMap(jsonObject, extra)
    emitter.sendEvent(EventName.SUBMIT, submitMap.toJSONObject())
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    val jsonObject = ActionComponentData.Companion.SERIALIZER.serialize(actionComponentData)
    emitter.sendEvent(EventName.ADDITIONAL_DETAILS, jsonObject)
  }

  override fun onException(exception: Exception) {
    emitter.sendError(EventName.ERROR, exception)
  }

  override fun onFinished() {
    val jsonObject = ResponseDTO(resultCode = ResultCodes.PRESENT_TO_SHOPPER.value).toJSONObject()
    emitter.sendEvent(EventName.COMPLETE_VOUCHER, jsonObject)
  }
}
