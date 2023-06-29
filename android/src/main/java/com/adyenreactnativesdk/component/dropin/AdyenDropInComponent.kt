/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.component.dropin.DropInServiceProxy.DropInServiceListener
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.*
import org.json.JSONException
import org.json.JSONObject

class AdyenDropInComponent(context: ReactApplicationContext?) : BaseModule(context),
    DropInServiceListener,
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
        val environment = parser.environment
        val clientKey: String
        parser.clientKey.let {
            clientKey = if (it != null) it else {
                sendErrorEvent(BaseModuleException.NoClientKey())
                return
            }
        }

        val builder = Builder(reactApplicationContext, AdyenCheckoutService::class.java, clientKey)
            .setEnvironment(environment)

        parser.locale?.let { builder.setShopperLocale(it) }
        configureDropIn(builder, configuration)
        configureCards(builder, configuration)
        configureBcmc(builder, configuration)
        configure3DS(builder)

        val amount = parser.amount
        val countryCode = parser.countryCode
        if (amount != null && countryCode != null) {
            builder.setAmount(amount)
            configureGooglePay(builder, configuration, countryCode)
        }
        val currentActivity = reactApplicationContext.currentActivity
        val resultIntent = Intent(currentActivity, currentActivity!!.javaClass)
        resultIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)

        AdyenCheckout.addDropInListener(this)
        AdyenCheckout.dropInLauncher?.let {
            startPayment(currentActivity, it, paymentMethodsResponse, builder.build(), resultIntent)
        } ?: run {
            startPayment(currentActivity, paymentMethodsResponse, builder.build(), resultIntent)
        }
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        val listener = DropInServiceProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(DropInException.NoModuleListener())
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            listener.onAction(jsonObject)
        } catch (e: JSONException) {
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

    override fun onDidSubmit(jsonObject: JSONObject) {
        val map: WritableMap = try {
            ReactNativeJson.convertJsonToMap(jsonObject)
        } catch (e: JSONException) {
            sendErrorEvent(e)
            return
        }
        val context = reactApplicationContext
        map.putString(AdyenConstants.PARAMETER_RETURN_URL, RedirectComponent.getReturnUrl(context))
        sendEvent(DID_SUBMIT, map)
    }

    override fun onDidProvide(jsonObject: JSONObject) {
        try {
            val map = ReactNativeJson.convertJsonToMap(jsonObject)
            sendEvent(DID_PROVIDE, map)
        } catch (e: JSONException) {
            sendErrorEvent(e)
        }
    }

    private fun proxyHideDropInCommand(success: Boolean, message: ReadableMap?) {
        val listener = DropInServiceProxy.shared.moduleListener
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
                builder.builderShopperLocale,
                builder.builderEnvironment,
                builder.builderClientKey
            )

                .build()
        )
    }

    private fun configureBcmc(builder: Builder, configuration: ReadableMap) {
        var bcmcConfig = configuration.getMap("bcmc")
        if (bcmcConfig == null) {
            bcmcConfig = JavaOnlyMap()
        }
        val parser = CardConfigurationParser(bcmcConfig)
        val bcmcBuilder = BcmcConfiguration.Builder(
            builder.builderShopperLocale,
            builder.builderEnvironment,
            builder.builderClientKey
        )
        builder.addBcmcConfiguration(parser.getConfiguration(bcmcBuilder))
    }

    private fun configureCards(builder: Builder, configuration: ReadableMap) {
        val parser = CardConfigurationParser(configuration)
        val cardBuilder = CardConfiguration.Builder(
            builder.builderShopperLocale,
            builder.builderEnvironment,
            builder.builderClientKey
        )
        builder.addCardConfiguration(parser.getConfiguration(cardBuilder))
    }

    init {
        DropInServiceProxy.shared.serviceListener = this
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