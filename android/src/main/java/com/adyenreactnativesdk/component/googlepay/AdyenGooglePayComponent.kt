package com.adyenreactnativesdk.component.googlepay

import com.adyen.checkout.components.core.ComponentAvailableCallback
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException
import org.json.JSONObject

class AdyenGooglePayComponent(context: ReactApplicationContext?) : BaseModule(context), CheckoutProxy.ComponentEventListener {

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData) ?: return

        val googlePayPaymentMethod = getPaymentMethod(paymentMethods, PAYMENT_METHOD_KEYS)
        if (googlePayPaymentMethod == null) {
            sendErrorEvent(BaseModuleException.NoPaymentMethods(PAYMENT_METHOD_KEYS))
            return
        }

        val rootParser = RootConfigurationParser(configuration)
        val environment = rootParser.environment
        val shopperLocale = rootParser.locale ?: currentLocale(reactApplicationContext)
        val clientKey: String
        rootParser.clientKey.let {
            clientKey = if (it != null) it else {
                sendErrorEvent(BaseModuleException.NoClientKey())
                return
            }
        }

        val amount = rootParser.amount
        val countryCode = rootParser.countryCode
        if (amount == null || countryCode == null) {
            sendErrorEvent(BaseModuleException.NoPayment())
            return
        }

        val parser = GooglePayConfigurationParser(configuration)
        val configBuilder = GooglePayConfiguration.Builder(
            shopperLocale,
            environment,
            clientKey
        )
            .setCountryCode(countryCode)
            .setAmount(amount)
        val googlePayConfiguration: GooglePayConfiguration = parser.getConfiguration(configBuilder, environment)

        val payPaymentMethod: PaymentMethod = googlePayPaymentMethod
        CheckoutProxy.shared.componentListener = this
        GooglePayComponent.run {
            PROVIDER.isAvailable(appCompatActivity.application, payPaymentMethod, googlePayConfiguration,
                object : ComponentAvailableCallback {
                    override fun onAvailabilityResult(
                        isAvailable: Boolean,
                        paymentMethod: PaymentMethod
                    ) {
                        if (!isAvailable) {
                            sendErrorEvent(GooglePayException.NotSupported())
                            return
                        }
                        GooglePayFragment.show(appCompatActivity.supportFragmentManager, googlePayConfiguration, paymentMethod)
                    }
                })
        }
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            GooglePayFragment.handle(appCompatActivity.supportFragmentManager, action)
        } catch (e: JSONException) {
            sendErrorEvent(BaseModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        GooglePayFragment.hide(appCompatActivity.supportFragmentManager)
        AdyenCheckout.removeActivityResultHandlingComponent()
        AdyenCheckout.removeIntentHandler()
        CheckoutProxy.shared.componentListener = null
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenGooglePay"
        internal const val GOOGLEPAY_REQUEST_CODE = 1001
        private val PAYMENT_METHOD_KEYS = setOf("paywithgoogle", "googlepay")
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        val returnUrl = getReturnUrl(reactApplicationContext)
        jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, returnUrl)
        var extra: JSONObject? = null
        if (state is GooglePayComponentState) {
            state.paymentData?.let {
                extra = JSONObject(it.toJson())
            }
        }
        val submitMap = SubmitMap(jsonObject, extra)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

}

sealed class GooglePayException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class NotSupported : GooglePayException(
        code = "notSupported",
        message = "GooglePay unavailable"
    )
}


