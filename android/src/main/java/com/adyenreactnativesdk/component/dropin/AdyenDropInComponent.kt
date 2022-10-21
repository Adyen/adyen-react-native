/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.content.Context
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.dropin.DropIn.startPayment
import com.facebook.react.bridge.ReactApplicationContext
import com.adyenreactnativesdk.component.dropin.DropInServiceProxy.DropInServiceListener
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.ReactNativeError
import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import org.json.JSONObject
import com.adyenreactnativesdk.util.ReactNativeJson
import org.json.JSONException
import com.facebook.react.bridge.WritableMap
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.facebook.react.bridge.JavaOnlyMap
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.core.api.Environment
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropInResult
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.util.AdyenConstants
import java.lang.IllegalStateException

class AdyenDropInComponent(context: ReactApplicationContext?) : BaseModule(context),
    DropInServiceListener,
    Cancelable {

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
        val environment: Environment
        val clientKey: String
        try {
            environment = parser.environment
            clientKey = parser.clientKey
        } catch (e: NoSuchFieldException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
            return
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
            val e = IllegalStateException("Invalid state: DropInModuleListener is missing")
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            listener.onAction(jsonObject)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean, message: ReadableMap?) {
        proxyHideDropInCommand(success, message)
        dropInLauncher = null
        dropInCallback.cancelDelegate = null
    }

    override fun onCancel() {
        sendEvent(DID_FAILED, ReactNativeError.mapError(AdyenConstants.ERROR_CANCELED_BY_SHOPPER))
    }

    override fun onDidSubmit(jsonObject: JSONObject) {
        val map: WritableMap = try {
            ReactNativeJson.convertJsonToMap(jsonObject)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
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
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    private fun proxyHideDropInCommand(success: Boolean, message: ReadableMap?) {
        val listener = DropInServiceProxy.shared.moduleListener
        if (listener == null) {
            val e = IllegalStateException("$TAG Invalid state: DropInModuleListener is missing")
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
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
        dropInCallback.cancelDelegate = this
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
    }

}

internal interface Cancelable {
    fun onCancel()
}

internal interface ReactDropInCallback {
    fun onDropInResult(dropInResult: DropInResult?)
}

internal class ReactDropInResultContract : ActivityResultContract<Intent, DropInResult?>() {
    override fun createIntent(context: Context, input: Intent): Intent {
        return input
    }

    override fun parseResult(resultCode: Int, intent: Intent?): DropInResult? {
        return DropIn.handleActivityResult(DropIn.DROP_IN_REQUEST_CODE, resultCode, intent)
    }
}

private class DropInCallbackListener: ReactDropInCallback {

    var cancelDelegate: Cancelable? = null

    override fun onDropInResult(dropInResult: DropInResult?) {
        if (dropInResult == null) return
        when (dropInResult) {
            is DropInResult.CancelledByUser -> cancelDelegate?.onCancel()
        }
    }
}
