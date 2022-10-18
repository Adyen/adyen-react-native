package com.adyenreactnativesdk.component.instant

import android.util.Log
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.model.payments.request.GenericPaymentMethod
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.components.model.payments.request.PaymentMethodDetails
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.core.api.Environment
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.action.ActionHandlerConfiguration
import com.adyenreactnativesdk.action.ActionHandlingInterface
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.ui.PaymentComponentListener
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONException
import java.util.*

class AdyenInstantComponent(context: ReactApplicationContext?) : BaseModule(context),
    PaymentComponentListener, ActionHandlingInterface {

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { }

    @ReactMethod
    fun removeListeners(count: Int?) { }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData)?.paymentMethods
        if (paymentMethods == null || paymentMethods.isEmpty()) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("$TAG: can not deserialize paymentMethods")
            )
            return
        }
        val paymentMethod = paymentMethods[0]
        val type = paymentMethod.type
        if (paymentMethod == null || type.isNullOrEmpty()) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("$TAG: can not parse payment methods")
            )
            return
        }

        val config = RootConfigurationParser(configuration)
        val environment: Environment
        val clientKey: String
        val shopperLocale: Locale
        try {
            environment = config.environment
            clientKey = config.clientKey
            shopperLocale = config.locale ?: currentLocale(reactApplicationContext)
        } catch (e: NoSuchFieldException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
            return
        }

        val actionHandlerConfiguration =
            ActionHandlerConfiguration(shopperLocale, environment, clientKey)
        actionHandler = ActionHandler(this, actionHandlerConfiguration)

        sendPayment(type)
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            actionHandler?.handleAction(appCompatActivity, action)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        appCompatActivity.runOnUiThread {
            actionHandler?.hide(appCompatActivity)
        }
        actionHandler = null
    }

    override fun onError(error: Exception) {
        val errorMap = ReactNativeError.mapError(error)
        sendEvent(DID_FAILED, errorMap)
    }

    override fun onSubmit(data: PaymentComponentData<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
        try {
            val map: WritableMap = ReactNativeJson.convertJsonToMap(jsonObject)
            map.putString("returnUrl", ActionHandler.getReturnUrl(reactApplicationContext))
            Log.d(TAG, "Paying")
            sendEvent(DID_SUBMIT, map)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    override fun provide(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        try {
            val map = ReactNativeJson.convertJsonToMap(jsonObject)
            sendEvent(DID_PROVIDE, map)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    override fun onClose() {
        sendEvent(DID_FAILED, ReactNativeError.mapError("Closed"))
    }

    override fun onFinish() {
        sendEvent(DID_COMPLETE, null)
    }

    private fun sendPayment(type: String) {
        val paymentComponentData = PaymentComponentData<PaymentMethodDetails>()
        paymentComponentData.paymentMethod = GenericPaymentMethod(type)
        val paymentComponentState = GenericPaymentComponentState(
            paymentComponentData,
            isInputValid = true,
            isReady = true
        )
        onSubmit(paymentComponentState.data)
    }

    companion object {
        private const val TAG = "InstantComponent"
        private const val COMPONENT_NAME = "AdyenInstant"
    }
}

