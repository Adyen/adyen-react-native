/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.googlepay

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentAvailableCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.KnownException
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class GooglePayModule(context: ReactApplicationContext?) : BaseModule(context),
    CheckoutProxy.ComponentEventListener {

    override fun getName(): String = COMPONENT_NAME

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */
    }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val checkoutConfiguration: CheckoutConfiguration
        val paymentMethodsResponse: PaymentMethodsApiResponse
        try {
            paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData)
            checkoutConfiguration = getCheckoutConfiguration(configuration)
        } catch (e: java.lang.Exception) {
            return sendErrorEvent(e)
        }

        val googlePayPaymentMethod = getPaymentMethod(paymentMethodsResponse, PAYMENT_METHOD_KEYS)
        if (googlePayPaymentMethod == null) {
            sendErrorEvent(ModuleException.NoPaymentMethods(PAYMENT_METHOD_KEYS))
            return
        }

        val payPaymentMethod: PaymentMethod = googlePayPaymentMethod
        CheckoutProxy.shared.componentListener = this
        GooglePayComponent.run {
            PROVIDER.isAvailable(appCompatActivity.application,
                payPaymentMethod,
                checkoutConfiguration,
                object : ComponentAvailableCallback {
                    override fun onAvailabilityResult(
                        isAvailable: Boolean,
                        paymentMethod: PaymentMethod
                    ) {
                        if (!isAvailable) {
                            sendErrorEvent(GooglePayException.NotSupported())
                            return
                        }
                        GooglePayFragment.show(
                            appCompatActivity.supportFragmentManager,
                            checkoutConfiguration,
                            paymentMethod,
                            session
                        )
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
            sendErrorEvent(ModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        cleanup()
        GooglePayFragment.hide(appCompatActivity.supportFragmentManager)
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenGooglePay"
        internal const val GOOGLEPAY_REQUEST_CODE = 1001
        private val PAYMENT_METHOD_KEYS = setOf("paywithgoogle", "googlepay")
    }
}

sealed class GooglePayException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class NotSupported : GooglePayException(
        code = "notSupported",
        message = "GooglePay unavailable"
    )
}


