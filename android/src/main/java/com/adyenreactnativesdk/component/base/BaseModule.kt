/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.appcompat.app.AppCompatActivity
import com.adyen.checkout.adyen3ds2.Cancelled3DS2Exception
import com.adyen.checkout.adyen3ds2.adyen3DS2
import com.adyen.checkout.bcmc.bcmc
import com.adyen.checkout.card.card
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.dropin.dropIn
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.googlepay.googlePay
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.CheckoutSessionProvider
import com.adyen.checkout.sessions.core.CheckoutSessionResult
import com.adyen.checkout.sessions.core.SessionModel
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.AnalyticsParser
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyenreactnativesdk.configuration.DropInConfigurationParser
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.configuration.ThreeDSConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import org.json.JSONException
import org.json.JSONObject

abstract class BaseModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context),
    CheckoutProxy.ComponentEventListener {

    internal fun sendEvent(eventName: String, jsonObject: JSONObject) {
        try {
            reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, ReactNativeJson.convertJsonToMap(jsonObject))
        } catch (e: JSONException) {
            sendErrorEvent(e)
        }
    }

    internal var integration = if (session == null) "advanced" else "session"

    protected fun sendErrorEvent(error: Exception) {
        reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_FAILED, ReactNativeError.mapError(error))
    }

    private fun sendFinishEvent(result: SessionPaymentResult) {
        val jsonObject = JSONObject().apply {
            put(RESULT_CODE_KEY, result.resultCode)
            put(ORDER_KEY, result.order?.let { OrderResponse.SERIALIZER.serialize(it) })
            put(SESSION_RESULT_KEY, result.sessionResult)
            put(SESSION_DATA_KEY, result.sessionData)
            put(SESSION_ID_KEY, result.sessionId)
        }
        sendEvent(DID_COMPLETE, jsonObject)
    }

    protected fun getPaymentMethodsApiResponse(paymentMethods: ReadableMap?): PaymentMethodsApiResponse {
        return try {
            val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
            PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject)
        } catch (e: JSONException) {
            throw ModuleException.InvalidPaymentMethods(e)
        }
    }

    protected fun getPaymentMethod(
        paymentMethodsResponse: PaymentMethodsApiResponse, paymentMethodNames: Set<String>
    ): PaymentMethod? {
        return paymentMethodsResponse.paymentMethods?.firstOrNull { paymentMethodNames.contains(it.type) }
    }

    protected val appCompatActivity: AppCompatActivity
        get() {
            val currentActivity = reactApplicationContext.currentActivity
            return currentActivity as AppCompatActivity?
                ?: throw Exception("Not an AppCompact Activity")
        }

    open suspend fun createSessionAsync(
        sessionModelJSON: ReadableMap, configurationJSON: ReadableMap, promise: Promise
    ) {
        val sessionModel: SessionModel
        val configuration: CheckoutConfiguration
        try {
            sessionModel = parseSessionModel(sessionModelJSON)
            configuration = getCheckoutConfiguration(configurationJSON)
        } catch (e: java.lang.Exception) {
            promise.reject(ModuleException.SessionError(e))
            return
        }

        session =
            when (val result = CheckoutSessionProvider.createSession(sessionModel, configuration)) {
                is CheckoutSessionResult.Success -> result.checkoutSession
                is CheckoutSessionResult.Error -> {
                    promise.reject(ModuleException.SessionError(null))
                    return
                }
            }

        session?.sessionSetupResponse?.let {
            val json = SessionSetupResponse.SERIALIZER.serialize(it)
            val map = ReactNativeJson.convertJsonToMap(json)
            promise.resolve(map)
        }
    }

    private fun parseSessionModel(json: ReadableMap): SessionModel {
        val sessionModelJSON = ReactNativeJson.convertMapToJson(json)
        return SessionModel.SERIALIZER.deserialize(sessionModelJSON)
    }

    open fun getRedirectUrl(): String? {
        return null
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        val extra =
            if (state is GooglePayComponentState) state.paymentData?.let {
                JSONObject(it.toJson())
            } else null
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        getRedirectUrl()?.let {
            jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, it)
        }

        val submitMap = SubmitMap(jsonObject, extra)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    override fun onException(exception: CheckoutException) {
        if (exception is CancellationException ||
            exception is Cancelled3DS2Exception ||
            exception.message == "Payment canceled."
        ) {
            sendErrorEvent(ModuleException.Canceled())
        } else {
            sendErrorEvent(exception)
        }
    }

    override fun onFinished(result: SessionPaymentResult) {
        val updatedResult = if (result.resultCode == VOUCHER_RESULT_CODE) {
            result.copy(resultCode = RESULT_CODE_PRESENTED)
        } else {
            result
        }
        sendFinishEvent(updatedResult)
    }

    override fun onAdditionalData(jsonObject: JSONObject) {
        sendEvent(DID_PROVIDE, jsonObject)
    }

    protected fun getCheckoutConfiguration(json: ReadableMap): CheckoutConfiguration {
        val rootParser = RootConfigurationParser(json)
        val countryCode = rootParser.countryCode
        val analyticsConfiguration = AnalyticsParser(json).analytics

        val clientKey = rootParser.clientKey ?: throw ModuleException.NoClientKey()
        return CheckoutConfiguration(
            environment = rootParser.environment,
            clientKey = clientKey,
            shopperLocale = rootParser.locale,
            amount = rootParser.amount,
            analyticsConfiguration = analyticsConfiguration
        ) {
            googlePay {
                setCountryCode(countryCode)
                val googlePayParser = GooglePayConfigurationParser(json)
                googlePayParser.applyConfiguration(this)
            }
            val cardParser = CardConfigurationParser(json, countryCode)
            card {
                cardParser.applyConfiguration(this)
            }
            bcmc {
                cardParser.applyConfiguration(this)
            }
            dropIn {
                val parser = DropInConfigurationParser(json)
                parser.applyConfiguration(this)
            }
            adyen3DS2 {
                val parser = ThreeDSConfigurationParser(json)
                parser.applyConfiguration(this)
            }
        }
    }

    protected fun cleanup() {
        session = null
        AdyenCheckout.removeComponent()
        AdyenCheckout.removeDropInListener()
        AdyenCheckout.removeAddressLookupListener()
        CheckoutProxy.shared.componentListener = null
    }

    companion object {
        const val DID_COMPLETE = "didCompleteCallback"
        const val DID_PROVIDE = "didProvideCallback"
        const val DID_FAILED = "didFailCallback"
        const val DID_SUBMIT = "didSubmitCallback"
        const val DID_UPDATE_ADDRESS = "didUpdateAddressCallback"
        const val DID_CONFIRM_ADDRESS = "didConfirmAddressCallback"

        const val RESULT_CODE_PRESENTED = "PresentToShopper"

        private const val VOUCHER_RESULT_CODE = "finish_with_action"
        private const val RESULT_CODE_KEY = "resultCode"
        private const val ORDER_KEY = "order"
        private const val SESSION_RESULT_KEY = "sessionResult"
        private const val SESSION_DATA_KEY = "sessionData"
        private const val SESSION_ID_KEY = "sessionId"

        @JvmStatic
        protected var session: CheckoutSession? = null
            private set
    }
}
