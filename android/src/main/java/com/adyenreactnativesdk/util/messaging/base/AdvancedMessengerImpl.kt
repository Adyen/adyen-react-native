package com.adyenreactnativesdk.util.messaging.base

import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyenreactnativesdk.component.model.ResultDTO
import com.adyenreactnativesdk.component.model.SubmitData
import com.adyenreactnativesdk.util.ResultCodes
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName

class AdvancedMessengerImpl(
  private val emitter: Emitter,
) : AdvancedMessenger {
  override fun onSubmit(data: PaymentComponentData<*>) {
    val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
    val submitData = SubmitData(jsonObject, null)
    emitter.sendEvent(EventName.SUBMIT, submitData.toJSONObject())
  }

  override fun onAdditionalDetails(data: ActionComponentData) {
    val jsonObject = ActionComponentData.SERIALIZER.serialize(data)
    emitter.sendEvent(EventName.ADDITIONAL_DETAILS, jsonObject)
  }

  override fun onException(exception: Exception) {
    emitter.sendError(EventName.ERROR, exception)
  }

  override fun onFinished() {
    val jsonObject = ResultDTO(resultCode = ResultCodes.PRESENT_TO_SHOPPER.value).toJSONObject()
    emitter.sendEvent(EventName.COMPLETE_VOUCHER, jsonObject)
  }

  override fun onFinished(resultCode: String) {
    val jsonObject = ResultDTO(resultCode = resultCode).toJSONObject()
    emitter.sendEvent(EventName.COMPLETE_VOUCHER, jsonObject)
  }
}
