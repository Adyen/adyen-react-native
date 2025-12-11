package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.adyen3ds2.Cancelled3DS2Exception
import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.model.BinLookupDataDTO
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.component.model.toJSONObject
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.gson.Gson
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

class MessageBus(
  private val context: ReactContext,
  private val gson: Gson,
) : ComponentEventListener,
  DropInStoredPaymentEventListener,
  CardComponentEventListener,
  AddressLookupCallback {
  fun sendErrorEvent(error: Exception) {
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(DID_FAILED, ReactNativeError.mapError(error))
  }

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
    sendEvent(DID_SUBMIT, submitMap.toJSONObject())
  }

  override fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  ) {
    sendEvent(DID_CANCEL_ORDER, order.toJSONObject(shouldUpdatePaymentMethods))
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
      when (result.resultCode) {
        VOUCHER_RESULT_CODE -> result.copy(resultCode = RESULT_CODE_PRESENTED)
        else -> result
      }
    sendFinishEvent(updatedResult)
  }

  private fun sendFinishEvent(result: SessionPaymentResult) {
    sendEvent(DID_COMPLETE, result.toJSONObject())
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    val jsonObject = ActionComponentData.Companion.SERIALIZER.serialize(actionComponentData)
    sendEvent(DID_PROVIDE, jsonObject)
  }

  override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
    val jsonObject = PaymentComponentData.Companion.SERIALIZER.serialize(paymentComponentState.data)
    sendEvent(DID_CHECK_BALANCE, jsonObject)
  }

  override fun onOrderRequest() {
    sendEvent(DID_REQUEST_ORDER, JSONObject())
  }

  override fun onRemove(storedPaymentMethod: StoredPaymentMethod) {
    val jsonObject = StoredPaymentMethod.Companion.SERIALIZER.serialize(storedPaymentMethod)
    sendEvent(DID_DISABLE_STORED_PAYMENT_METHOD, jsonObject)
  }

  override fun onQueryChanged(query: String) {
    sendEvent(DID_UPDATE_ADDRESS, query)
  }

  override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean {
    val jsonString = gson.toJson(lookupAddress)
    val jsonObject = JSONObject(jsonString)
    sendEvent(DID_CONFIRM_ADDRESS, jsonObject)
    return true
  }

  override fun onBinValue(binValue: String) {
    sendEvent(DID_CHANGE_BIN_VALUE, binValue)
  }

  override fun onBinLookup(data: List<BinLookupData>) {
    when {
      data.isEmpty() -> {
        return
      }

      else -> {
        val brandOnlyMap = data.map { BinLookupDataDTO(it.brand) }
        val jsonString = gson.toJson(brandOnlyMap)
        val jsonObject = JSONArray(jsonString)
        sendEvent(DID_BIN_LOOKUP, jsonObject)
      }
    }
  }

  private fun send(
    eventName: String,
    payload: Any?,
  ) {
    try {
      context
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, payload)
    } catch (e: JSONException) {
      sendErrorEvent(e)
    }
  }

  private fun sendEvent(
    eventName: String,
    jsonObject: JSONObject,
  ) {
    try {
      send(eventName, ReactNativeJson.convertJsonToMap(jsonObject))
    } catch (e: JSONException) {
      sendErrorEvent(e)
    }
  }

  private fun sendEvent(
    eventName: String,
    jsonObject: JSONArray,
  ) {
    try {
      send(eventName, ReactNativeJson.convertJsonToArray(jsonObject))
    } catch (e: JSONException) {
      sendErrorEvent(e)
    }
  }

  private fun sendEvent(
    eventName: String,
    string: String,
  ) {
    send(eventName, string)
  }

  companion object {
    private const val VOUCHER_RESULT_CODE = "finish_with_action"

    const val DID_COMPLETE = "didCompleteCallback"
    const val DID_PROVIDE = "didProvideCallback"
    const val DID_FAILED = "didFailCallback"
    const val DID_SUBMIT = "didSubmitCallback"
    const val DID_UPDATE_ADDRESS = "didUpdateAddressCallback"
    const val DID_CONFIRM_ADDRESS = "didConfirmAddressCallback"
    const val DID_DISABLE_STORED_PAYMENT_METHOD = "didDisableStoredPaymentMethodCallback"
    const val DID_CHECK_BALANCE = "didCheckBalanceCallback"
    const val DID_REQUEST_ORDER = "didRequestOrderCallback"
    const val DID_CANCEL_ORDER = "didCancelOrderCallback"
    const val DID_BIN_LOOKUP = "didBinLookupCallback"
    const val DID_CHANGE_BIN_VALUE = "didChangeBinValueCallback"
    const val RESULT_CODE_PRESENTED = "PresentToShopper"
  }
}
