/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

class DropInModule(context: ReactApplicationContext?) : BaseModule(context),
    ReactDropInCallback {

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */
    }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */
    }

    @ReactMethod
    fun getReturnURL(promise: Promise) {
        promise.resolve(getRedirectUrl())
    }

    override fun getName(): String = COMPONENT_NAME

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap?, configuration: ReadableMap) {
        val checkoutConfiguration: CheckoutConfiguration
        val paymentMethodsResponse: PaymentMethodsApiResponse
        try {
            paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData)
            checkoutConfiguration = getCheckoutConfiguration(configuration)
        } catch (e: java.lang.Exception) {
            return sendErrorEvent(e)
        }

        CheckoutProxy.shared.componentListener = this
        AdyenCheckout.addDropInListener(this)
        val session = session
        if (session != null) {
            AdyenCheckout.dropInSessionLauncher?.let {
                startPayment(
                    reactApplicationContext,
                    it,
                    session,
                    checkoutConfiguration,
                    SessionCheckoutService::class.java
                )
            } ?: throw ModuleException.NoActivity()
        } else {

            AdyenCheckout.dropInLauncher?.let {
                startPayment(
                    reactApplicationContext,
                    it,
                    paymentMethodsResponse,
                    checkoutConfiguration,
                    AdvancedCheckoutService::class.java
                )
            } ?: throw ModuleException.NoActivity()
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

    override fun getRedirectUrl(): String? {
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
        val jsonObject = JSONObject("{\"resultCode\": ${RESULT_CODE_PRESENTED}}")
        sendEvent(DID_COMPLETE, jsonObject)
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