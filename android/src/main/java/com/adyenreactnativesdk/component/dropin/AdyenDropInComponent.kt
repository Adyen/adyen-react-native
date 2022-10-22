/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.dropin.DropInResult
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.redirect.RedirectComponent
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
    fun addListener(eventName: String?) { }

    @ReactMethod
    fun removeListeners(count: Int?) { }
    
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
                sendErrorEvent(BaseModuleException.NO_CLIENT_KEY)
                return
            }
        }

        val builder = Builder(reactApplicationContext, AdyenDropInService::class.java, clientKey)
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

        dropInCallback.dropInCallback = this
        dropInLauncher?.let {
            startPayment(currentActivity, it, paymentMethodsResponse, builder.build(), resultIntent)
        } ?: run {
            startPayment(currentActivity, paymentMethodsResponse, builder.build(), resultIntent)
        }
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        val listener = DropInServiceProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(DropInException.NO_MODULE_LISTENER)
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            listener.onAction(jsonObject)
        } catch (e: JSONException) {
            sendErrorEvent(BaseModuleException.INVALID_ACTION)
        }
    }

    @ReactMethod
    fun hide(success: Boolean, message: ReadableMap?) {
        proxyHideDropInCommand(success, message)
        dropInCallback.dropInCallback = null
    }

    override fun onCancel() {
        sendErrorEvent(BaseModuleException.CANCELED)
    }

    override fun onError(reason: String?) {
        if (reason == "Challenge canceled.") { // for canceled 3DS
            sendErrorEvent(BaseModuleException.CANCELED)
        } else {
            sendErrorEvent(DropInException.unknown(reason))
        }
    }

    override fun onCompleated(result: String) {
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
            sendErrorEvent(DropInException.NO_MODULE_LISTENER)
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
            ).build()
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
        private var dropInLauncher: ActivityResultLauncher<Intent>? = null
        private val dropInCallback = DropInCallbackListener()

        @JvmStatic
        fun setDropInLauncher(activity: ActivityResultCaller) {
            dropInLauncher = activity.registerForActivityResult(ReactDropInResultContract(), dropInCallback::onDropInResult)
        }

        @JvmStatic
        fun removeDropInLauncher() {
            dropInLauncher = null
        }
    }

}

internal interface ReactDropInCallback {
    fun onCancel()
    fun onError(reason: String?)
    fun onCompleated(result: String)
}

private class ReactDropInResultContract : ActivityResultContract<Intent, DropInResult?>() {
    override fun createIntent(context: Context, input: Intent): Intent {
        return input
    }

    override fun parseResult(resultCode: Int, intent: Intent?): DropInResult? {
        return DropIn.handleActivityResult(DropIn.DROP_IN_REQUEST_CODE, resultCode, intent)
    }
}

private class DropInCallbackListener: DropInCallback {

    var dropInCallback: ReactDropInCallback? = null

    override fun onDropInResult(dropInResult: DropInResult?) {
        if (dropInResult == null) return
        when (dropInResult) {
            is DropInResult.CancelledByUser -> dropInCallback?.onCancel()
            is DropInResult.Error -> dropInCallback?.onError(dropInResult.reason)
            is DropInResult.Finished -> dropInCallback?.onCompleated(dropInResult.result)
        }
    }
}

class DropInException(code: String, message: String, cause: Throwable? = null) : KnownException(code = code, errorMessage = message, cause) {
    companion object {
        val NO_MODULE_LISTENER = DropInException(
            code = "noModulListener",
            message = "Invalid state: DropInModuleListener is missing"
        )
        fun unknown(reason: String?): DropInException {
            val message = if (reason.isNullOrEmpty()) "reason unknown" else reason
            return DropInException(
                code = "unknown",
                message = message
            )
        }
    }
}