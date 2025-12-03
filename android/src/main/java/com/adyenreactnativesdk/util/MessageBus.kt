package com.adyenreactnativesdk.util

import com.adyen.checkout.adyen3ds2.Cancelled3DS2Exception
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.BaseModule.Companion.DID_CANCEL_ORDER
import com.adyenreactnativesdk.component.base.BaseModule.Companion.DID_CHECK_BALANCE
import com.adyenreactnativesdk.component.base.BaseModule.Companion.DID_PROVIDE
import com.adyenreactnativesdk.component.base.BaseModule.Companion.DID_REQUEST_ORDER
import com.adyenreactnativesdk.component.base.BaseModule.Companion.DID_SUBMIT
import com.adyenreactnativesdk.component.base.BaseModule.Companion.RESULT_CODE_PRESENTED
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.model.SubmitMap
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONException
import org.json.JSONObject

class MessageBus(
  val context: ReactContext,
  val redirectUrl: String? = null,
) : CheckoutProxy.ComponentEventListener {
  fun sendEvent(
    eventName: String,
    jsonObject: JSONObject,
  ) {
    try {
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, ReactNativeJson.convertJsonToMap(jsonObject))
    } catch (e: JSONException) {
      sendErrorEvent(e)
    }
  }

  fun sendErrorEvent(error: Exception) {
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(BaseModule.Companion.DID_FAILED, ReactNativeError.mapError(error))
  }

  override fun onSubmit(state: PaymentComponentState<*>) {
    val extra =
      if (state is GooglePayComponentState) {
        state.paymentData?.let {
          JSONObject(it.toJson())
        }
      } else {
        null
      }
    val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
    redirectUrl?.let {
      jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, it)
    }

    val submitMap = SubmitMap(jsonObject, extra)
    sendEvent(DID_SUBMIT, submitMap.toJSONObject())
  }

  fun sendFinishEvent(result: SessionPaymentResult) {
    val jsonObject =
      JSONObject().apply {
        put(RESULT_CODE_KEY, result.resultCode)
        put(ORDER_KEY, result.order?.let { OrderResponse.Companion.SERIALIZER.serialize(it) })
        put(SESSION_RESULT_KEY, result.sessionResult)
        put(SESSION_DATA_KEY, result.sessionData)
        put(SESSION_ID_KEY, result.sessionId)
      }
    sendEvent(BaseModule.Companion.DID_COMPLETE, jsonObject)
  }

  override fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  ) {
    val jsonObject =
      JSONObject().apply {
        this.put(ORDER_KEY, Order.SERIALIZER.serialize(order))
        this.put(SHOULD_UPDATE_PAYMENT_METHODS_KEY, shouldUpdatePaymentMethods)
      }
    sendEvent(DID_CANCEL_ORDER, jsonObject)
  }

  override fun onException(exception: CheckoutException) {
    if (exception is CancellationException ||
      exception is Cancelled3DS2Exception ||
      exception.message == "Payment canceled."
    ) {
      sendErrorEvent(ModuleException.Canceled())
    } else {
      sendErrorEvent(exception)
    }
  }

  override fun onFinished(result: SessionPaymentResult) {
    val updatedResult =
      if (result.resultCode == VOUCHER_RESULT_CODE) {
        result.copy(resultCode = RESULT_CODE_PRESENTED)
      } else {
        result
      }
    sendFinishEvent(updatedResult)
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
    sendEvent(DID_PROVIDE, jsonObject)
  }

  override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
    val jsonObject = PaymentComponentData.SERIALIZER.serialize(paymentComponentState.data)
    sendEvent(DID_CHECK_BALANCE, jsonObject)
  }

  override fun onOrderRequest() {
    sendEvent(DID_REQUEST_ORDER, JSONObject())
  }

  companion object {
    private const val VOUCHER_RESULT_CODE = "finish_with_action"
    private const val RESULT_CODE_KEY = "resultCode"
    private const val ORDER_KEY = "order"
    private const val SESSION_RESULT_KEY = "sessionResult"
    private const val SESSION_DATA_KEY = "sessionData"
    private const val SESSION_ID_KEY = "sessionId"
    private const val SHOULD_UPDATE_PAYMENT_METHODS_KEY = "shouldUpdatePaymentMethods"
  }
}
