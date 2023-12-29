/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.components.core.Amount
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInConfiguration
import com.adyen.checkout.dropin.DropInConfiguration.Builder
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class DropInModule(context: ReactApplicationContext?) : BaseModule(context),
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
        val dropInConfiguration: DropInConfiguration
        val paymentMethodsResponse: PaymentMethodsApiResponse
        try {
            paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData)
            dropInConfiguration = parseConfiguration(configuration) as DropInConfiguration
        } catch (e: java.lang.Exception) {
            return sendErrorEvent(e)
        }

        CheckoutProxy.shared.componentListener = this
        AdyenCheckout.addDropInListener(this)
        val session = session
        if (session != null) {
            if (dropInConfiguration.skipListWhenSinglePaymentMethod && paymentMethodsResponse.paymentMethods?.size == 1) {
                session.sessionSetupResponse.paymentMethodsApiResponse?.paymentMethods = paymentMethodsResponse.paymentMethods
                session.sessionSetupResponse.paymentMethodsApiResponse?.storedPaymentMethods = null
            }
            AdyenCheckout.setIntentHandler(this)
            AdyenCheckout.dropInSessionLauncher?.let {
                startPayment(
                    reactApplicationContext,
                    it,
                    session,
                    dropInConfiguration,
                )
            }
        } else {
            AdyenCheckout.dropInLauncher?.let {
                startPayment(
                    reactApplicationContext,
                    it,
                    paymentMethodsResponse,
                    dropInConfiguration,
                    AdyenCheckoutService::class.java
                )
            }
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
        if (session == null) {
            proxyHideDropInCommand(success, message)
        }

        cleanup()
    }

    override fun parseConfiguration(json: ReadableMap): Configuration {
        val config = setupRootConfig(json)

        val builder = Builder(locale, environment, clientKey)
        configureDropIn(builder, json)
        configureBcmc(builder, json)
        configure3DS(builder)

        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())

        val amount = config.amount
        val countryCode = config.countryCode
        if (amount != null && countryCode != null) {
            builder.setAmount(amount)
            configureGooglePay(builder, json, countryCode, amount)
        }
        configureCards(builder, json, countryCode)

        return builder.build()
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
        // TODO: check voucher's use-case
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
    fun onFinished(result: SessionPaymentResult)
}