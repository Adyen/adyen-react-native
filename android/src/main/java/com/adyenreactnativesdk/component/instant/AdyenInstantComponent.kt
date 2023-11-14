package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.model.payments.request.GenericPaymentMethod
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.components.model.payments.request.PaymentMethodDetails
import com.adyen.checkout.components.model.payments.response.Action
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.action.ActionHandlerConfiguration
import com.adyenreactnativesdk.action.ActionHandlingInterface
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.ui.PaymentComponentListener
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class AdyenInstantComponent(context: ReactApplicationContext?) : BaseModule(context),
    PaymentComponentListener, ActionHandlingInterface {

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData)?.paymentMethods ?: return

        val type = paymentMethods.firstOrNull()?.type
        if (type == null) {
            sendErrorEvent(BaseModuleException.InvalidPaymentMethods(null))
            return
        }

        val config = RootConfigurationParser(configuration)
        val environment = config.environment
        val clientKey: String
        config.clientKey.let {
            clientKey = if (it != null) it else {
                sendErrorEvent(BaseModuleException.NoClientKey())
                return
            }
        }

        val shopperLocale = config.locale ?: currentLocale(reactApplicationContext)

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
            sendErrorEvent(BaseModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        appCompatActivity.runOnUiThread {
            actionHandler?.hide()
            actionHandler = null
            AdyenCheckout.removeIntentHandler()
        }
    }

    override fun onError(error: Exception) {
        sendErrorEvent(error)
    }

    override fun onSubmit(data: PaymentComponentData<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
        jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, ActionHandler.getReturnUrl(reactApplicationContext))
        val submitMap = SubmitMap(jsonObject, null)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    override fun provide(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        sendEvent(DID_PROVIDE, jsonObject)
    }

    override fun onClose() {
        sendErrorEvent(BaseModuleException.Canceled())
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

