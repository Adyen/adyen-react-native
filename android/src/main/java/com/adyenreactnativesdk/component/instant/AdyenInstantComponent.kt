package com.adyenreactnativesdk.component.instant

import android.content.Context
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.BuildConfig
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class AdyenInstantComponent(context: ReactApplicationContext?) : BaseModule(context), ComponentCallback<InstantComponentState> {

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
            .setAmount(amount)
            .build()
        InstantFragment.show(appCompatActivity.supportFragmentManager, instantPaymentConfiguration, type)
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
        appCompatActivity.runOnUiThread {
            InstantFragment.hide(appCompatActivity.supportFragmentManager)
            AdyenCheckout.removeIntentHandler()
        }
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        sendEvent(DID_PROVIDE, jsonObject)
    }

    override fun onError(componentError: ComponentError) {
        sendErrorEvent(componentError.exception)
    }

    override fun onSubmit(state: InstantComponentState) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        val returnUrl = getReturnUrl(reactApplicationContext)
        jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, returnUrl)
        val submitMap = SubmitMap(jsonObject, null)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    companion object {
        private const val TAG = "InstantComponent"
        private const val COMPONENT_NAME = "AdyenInstant"
        internal const val REDIRECT_RESULT_SCHEME = BuildConfig.adyenReactNativeRedirectScheme + "://"
        internal fun getReturnUrl(context: Context): String {
            return REDIRECT_RESULT_SCHEME + context.packageName
        }
    }

}

