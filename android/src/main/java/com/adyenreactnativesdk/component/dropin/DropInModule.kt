/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.os.Build
import android.util.Log
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.components.core.Amount
import com.adyen.checkout.core.Environment
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.util.Locale

class DropInModule(context: ReactApplicationContext?) : BaseModule(context),
    ReactDropInCallback {

    private lateinit var environment: Environment
    private lateinit var clientKey: String
    private lateinit var locale: Locale

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
        if (clientKey == null) {
            sendErrorEvent(ModuleException.NoClientKey())
            return
        }
        this.environment = parser.environment
        this.clientKey = clientKey
        this.locale = parser.locale ?: if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            reactApplicationContext.resources.configuration.locales[0]
        } else {
            reactApplicationContext.resources.configuration.locale
        }
        val builder = Builder(locale, environment, clientKey)
        configureDropIn(builder, configuration)
        configureBcmc(builder, configuration)
        configure3DS(builder)
        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())

        val amount = parser.amount
        val countryCode = parser.countryCode
        if (amount != null && countryCode != null) {
            builder.setAmount(amount)
            configureGooglePay(builder, configuration, countryCode, amount)
        }
        configureCards(builder, configuration, countryCode)

        CheckoutProxy.shared.componentListener = this
        AdyenCheckout.addDropInListener(this)
        AdyenCheckout.dropInLauncher?.let {
            startPayment(
                reactApplicationContext,
                it,
                paymentMethodsResponse,
                builder.build(),
                AdyenCheckoutService::class.java
            )
        } ?: run {
            Log.e(
                TAG,
                "Invalid state: dropInLauncher not set. " +
                        "Call AdyenCheckout.setLauncherActivity(this) on MainActivity.onCreate()"
            )
            return
        }
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        val listener = CheckoutProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener())
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            listener.onAction(jsonObject)
        } catch (e: Exception) {
            sendErrorEvent(ModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean, message: ReadableMap?) {
        proxyHideDropInCommand(success, message)
        AdyenCheckout.removeDropInListener()
        CheckoutProxy.shared.componentListener = null
    }

    override fun getRedirectUrl(): String {
        return RedirectComponent.getReturnUrl(reactApplicationContext)
    }

    override fun onCancel() {
        sendErrorEvent(ModuleException.Canceled())
    }

    override fun onError(reason: String?) {
        if (reason == THREEDS_CANCELED_MESSAGE) { // for canceled 3DS
            sendErrorEvent(ModuleException.Canceled())
        } else {
            sendErrorEvent(ModuleException.Unknown(reason))
        }
    }

    override fun onCompleted(result: String) {
        hide(true, null)
    }

    private fun proxyHideDropInCommand(success: Boolean, message: ReadableMap?) {
        val listener = CheckoutProxy.shared.moduleListener
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener())
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
        countryCode: String,
        amount: Amount
    ) {
        val parser = GooglePayConfigurationParser(configuration)
        val configBuilder = GooglePayConfiguration.Builder(
            locale,
            environment,
            clientKey
        )
            .setCountryCode(countryCode)
            .setAmount(amount)
        val googlePayConfiguration = parser.getConfiguration(configBuilder, environment)
        builder.addGooglePayConfiguration(googlePayConfiguration)
    }

    private fun configure3DS(builder: Builder) {
        builder.add3ds2ActionConfiguration(
            Adyen3DS2Configuration.Builder(
                locale,
                environment,
                clientKey
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
            locale,
            environment,
            clientKey
        )
        builder.addBcmcConfiguration(parser.getConfiguration(bcmcBuilder))
    }

    private fun configureCards(builder: Builder, configuration: ReadableMap, countryCode: String?) {
        val parser = CardConfigurationParser(configuration, countryCode)
        val cardBuilder = CardConfiguration.Builder(
            locale,
            environment,
            clientKey
        )
        builder.addCardConfiguration(parser.getConfiguration(cardBuilder))
    }

    companion object {
        private const val TAG = "DropInComponent"
        private const val COMPONENT_NAME = "AdyenDropIn"
        private const val THREEDS_CANCELED_MESSAGE = "Challenge canceled."
    }

}

internal interface ReactDropInCallback {
    fun onCancel()
    fun onError(reason: String?)
    fun onCompleted(result: String)
}