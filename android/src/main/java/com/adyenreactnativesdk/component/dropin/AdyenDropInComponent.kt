/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import androidx.activity.result.ActivityResultCaller
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.Environment
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.component.dropin.CheckoutProxy.ComponentEventListener
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.util.Locale

class AdyenDropInComponent(context: ReactApplicationContext?) : BaseModule(context),
    ComponentEventListener,
    ReactDropInCallback {

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }
    
    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap?, configuration: ReadableMap) {
        val paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData) ?: return
        val parser = RootConfigurationParser(configuration)
        val clientKey = parser.clientKey
        if(clientKey == null) {
            sendErrorEvent(BaseModuleException.NoClientKey())
            return
        }

        val locale = parser.locale
        val builder = if (locale != null) {
            Builder(locale, parser.environment, clientKey)
        } else {
            Builder(reactApplicationContext, parser.environment, clientKey)
        }
        configureDropIn(builder, configuration)
        configureBcmc(builder, configuration)
        configure3DS(builder)

        val amount = parser.amount
        val countryCode = parser.countryCode
        if (amount != null && countryCode != null) {
            builder.setAmount(amount)
            configureGooglePay(builder, configuration, countryCode)
        }
        configureCards(builder, configuration, countryCode)
        val currentActivity = reactApplicationContext.currentActivity
        // val resultIntent = Intent(currentActivity, currentActivity!!.javaClass)
        // resultIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)

//        AdyenCheckout.addDropInListener(this)
//        AdyenCheckout.dropInLauncher?.let {
//            startPayment(currentActivity, it, paymentMethodsResponse, builder.build(), AdyenCheckoutService::class.java)
//        } ?: run {
//            startPayment(currentActivity, paymentMethodsResponse, builder.build(), AdyenCheckoutService::class.java)
//        }

    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        val listener = CheckoutProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(DropInException.NoModuleListener())
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            listener.onAction(jsonObject)
        } catch (e: Exception) {
            sendErrorEvent(BaseModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean, message: ReadableMap?) {
        proxyHideDropInCommand(success, message)
        AdyenCheckout.removeDropInListener()
    }

    override fun onCancel() {
        sendErrorEvent(BaseModuleException.Canceled())
    }

    override fun onError(reason: String?) {
        if (reason == "Challenge canceled.") { // for canceled 3DS
            sendErrorEvent(BaseModuleException.Canceled())
        } else {
            sendErrorEvent(DropInException.Unknown(reason))
        }
    }

    override fun onCompleted(result: String) {
        hide(true, null)
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        var extra: JSONObject? = null
        if (state is GooglePayComponentState) {
            state.paymentData?.let {
                extra = JSONObject(it.toJson())
            }
        }
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        val returnUrl = RedirectComponent.getReturnUrl(reactApplicationContext)
        jsonObject.getJSONObject(SubmitMap.PAYMENT_DATA_KEY)
            .put(AdyenConstants.PARAMETER_RETURN_URL, returnUrl)
        val submitMap = SubmitMap(jsonObject, extra)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    override fun onAdditionalData(jsonObject: JSONObject) {
        sendEvent(DID_PROVIDE, jsonObject)
    }

    private fun proxyHideDropInCommand(success: Boolean, message: ReadableMap?) {
        val listener = CheckoutProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(DropInException.NoModuleListener())
            return
        }
        val messageString = message?.getString(AdyenConstants.PARAMETER_MESSAGE)
        if (success && messageString != null) {
            listener.onComplete(messageString)
        } else {
            listener.onFail(message)
        }
    }

    private fun configureDropIn(builder: Builder, configuration: ReadableMap) {
        val parser = DropInConfigurationParser(configuration)
        builder.setShowPreselectedStoredPaymentMethod(parser.showPreselectedStoredPaymentMethod)
        builder.setSkipListWhenSinglePaymentMethod(parser.skipListWhenSinglePaymentMethod)
    }

    private fun configureGooglePay(
        builder: Builder,
        configuration: ReadableMap,
        countryCode: String
    ) {
        val parser = GooglePayConfigurationParser(configuration)
        val configBuilder = GooglePayConfiguration.Builder(
            builder.builderShopperLocale,
            builder.builderEnvironment,
            builder.builderClientKey
        )
            .setCountryCode(countryCode)
            .setAmount(builder.amount)
        val googlePayConfiguration = parser.getConfiguration(configBuilder)
        builder.addGooglePayConfiguration(googlePayConfiguration)
    }

    private fun configure3DS(builder: Builder) {
        builder.add3ds2ActionConfiguration(
            Adyen3DS2Configuration.Builder(
                builder.shopperLocale,
                builder.builderEnvironment,
                builder.builderClientKey
            ).build()
        )
    }

    private fun configureBcmc(builder: Builder, configuration: ReadableMap) {
        var bcmcConfig = configuration.getMap("bcmc")
        if (bcmcConfig == null) {
            bcmcConfig = JavaOnlyMap()
        }
        val parser = CardConfigurationParser(bcmcConfig, null)
        val bcmcBuilder = BcmcConfiguration.Builder(
            builder.builderShopperLocale,
            builder.builderEnvironment,
            builder.builderClientKey
        )
        builder.addBcmcConfiguration(parser.getConfiguration(bcmcBuilder))
    }

    private fun configureCards(builder: Builder, configuration: ReadableMap, countryCode: String?) {
        val parser = CardConfigurationParser(configuration, countryCode)
        val cardBuilder = CardConfiguration.Builder(
            builder.builderShopperLocale,
            builder.builderEnvironment,
            builder.builderClientKey
        )
        builder.addCardConfiguration(parser.getConfiguration(cardBuilder))
    }

    init {
        CheckoutProxy.shared.componentListener = this
    }

    companion object {
        private const val TAG = "DropInComponent"
        private const val COMPONENT_NAME = "AdyenDropIn"
    }

}

internal interface ReactDropInCallback {
    fun onCancel()
    fun onError(reason: String?)
    fun onCompleted(result: String)
}

sealed class DropInException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class NoModuleListener : DropInException(
        code = "noModulListener",
        message = "Invalid state: DropInModuleListener is missing"
    )

    class Unknown(reason: String?) : DropInException(
        code = "unknown",
        message = if (reason.isNullOrEmpty()) "reason unknown" else reason
    )
}
