package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.BuildConfig
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.dropin.CheckoutProxy
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException
import org.json.JSONObject

class AdyenInstantComponent(context: ReactApplicationContext?) : BaseModule(context), CheckoutProxy.ComponentEventListener {

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
        val amount = config.amount
        val clientKey = config.clientKey.let {
            if (it != null) it else {
                sendErrorEvent(BaseModuleException.NoClientKey())
                return
            }
        }

        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())
        val shopperLocale = config.locale ?: currentLocale(reactApplicationContext)
        val instantPaymentConfiguration = InstantPaymentConfiguration.Builder(shopperLocale, environment, clientKey)
        amount?.let {
            instantPaymentConfiguration.setAmount(it)
        }
        CheckoutProxy.shared.componentListener = this
        InstantFragment.show(appCompatActivity.supportFragmentManager, instantPaymentConfiguration.build(), type)
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            InstantFragment.handle(appCompatActivity.supportFragmentManager, action)
        } catch (e: JSONException) {
            sendErrorEvent(BaseModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        InstantFragment.hide(appCompatActivity.supportFragmentManager)
        AdyenCheckout.removeIntentHandler()
        CheckoutProxy.shared.componentListener = null
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenInstant"
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        val returnUrl = getReturnUrl(reactApplicationContext)
        jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, returnUrl)
        val submitMap = SubmitMap(jsonObject, null)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    override fun onAdditionalData(jsonObject: JSONObject) {
        sendEvent(DID_PROVIDE, jsonObject)
    }

    override fun onException(exception: CheckoutException) {
        sendErrorEvent(exception)
    }

}

