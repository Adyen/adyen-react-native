/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.core.Environment
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.internal.data.api.HttpClientFactory
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.CheckoutSessionProvider
import com.adyen.checkout.sessions.core.CheckoutSessionResult
import com.adyen.checkout.sessions.core.SessionModel
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyen.checkout.sessions.core.internal.data.api.SessionService
import com.adyen.checkout.sessions.core.internal.data.model.SessionDetailsRequest
import com.adyen.checkout.sessions.core.internal.data.model.SessionDetailsResponse
import com.adyen.checkout.ui.core.internal.DefaultRedirectHandler
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.BuildConfig
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.model.SubmitMap
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import kotlinx.coroutines.launch
import org.json.JSONException
import org.json.JSONObject
import java.util.Locale

abstract class BaseModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context),
    CheckoutProxy.ComponentEventListener, ActionHandlingComponent {

    lateinit var environment: Environment
    lateinit var clientKey: String
    lateinit var locale: Locale

    private fun sendEvent(eventName: String, jsonObject: JSONObject) {
        try {
            reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, ReactNativeJson.convertJsonToMap(jsonObject))
        } catch (e: JSONException) {
            sendErrorEvent(e)
        }
    }

    protected fun sendErrorEvent(error: Exception) {
        reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_FAILED, ReactNativeError.mapError(error))
    }

    private fun sendFinishEvent(result: SessionDetailsResponse) {
        val jsonObject = SessionDetailsResponse.SERIALIZER.serialize(result)
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

    private fun currentLocale(context: Context): Locale {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            context.resources.configuration.locales.get(0)
        } else {
            context.resources.configuration.locale
        }
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
        val sessionModel = parseSessionModel(sessionModelJSON)
        val configuration = parseConfiguration(configurationJSON)

        session =
            when (val result = CheckoutSessionProvider.createSession(sessionModel, configuration)) {
                is CheckoutSessionResult.Success -> result.checkoutSession
                is CheckoutSessionResult.Error -> {
                    promise.reject(ModuleException.SessionError())
                    return
                }
            }

        session?.sessionSetupResponse?.let {
            val json = SessionSetupResponse.SERIALIZER.serialize(it)
            val map = ReactNativeJson.convertJsonToMap(json)
            promise.resolve(map)
        }
    }

    abstract fun parseConfiguration(json: ReadableMap): Configuration

    private fun parseSessionModel(json: ReadableMap): SessionModel {
        var json = ReactNativeJson.convertMapToJson(json)
        return SessionModel.SERIALIZER.deserialize(json)
    }

    open fun getRedirectUrl(): String {
        return getReturnUrl(reactApplicationContext)
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        val extra =
            if (state is GooglePayComponentState) state.paymentData?.let {
                JSONObject(it.toJson())
            } else null
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(state.data)
        jsonObject.put(AdyenConstants.PARAMETER_RETURN_URL, getRedirectUrl())
        val submitMap = SubmitMap(jsonObject, extra)
        sendEvent(DID_SUBMIT, submitMap.toJSONObject())
    }

    override fun onException(exception: CheckoutException) {
        if (exception is CancellationException || exception.message == "Payment canceled.") {
            sendErrorEvent(ModuleException.Canceled())
        } else {
            sendErrorEvent(exception)
        }
    }

    override fun onFinished(result: SessionPaymentResult) {
        sendFinishEvent(
            SessionDetailsResponse(
                result.sessionData ?: "",
                "",
                result.resultCode,
                null,
                result.sessionResult,
                result.order
            )
        )
    }

    override fun onAdditionalData(jsonObject: JSONObject) {
        sendEvent(DID_PROVIDE, jsonObject)
    }

    override fun canHandleAction(action: Action): Boolean {
        throw NotImplementedError("This is base class")
    }

    override fun handleAction(action: Action, activity: Activity) {
        throw NotImplementedError("This is base class")
    }

    override fun handleIntent(intent: Intent) {
        val redirectHandler = DefaultRedirectHandler()
        val json = redirectHandler.parseRedirectResult(intent.data)
        val httpClient = HttpClientFactory.getHttpClient(environment)
        val sessionService = SessionService(httpClient)

        appCompatActivity.lifecycleScope
            .launch {
                session?.let {
                    val request = SessionDetailsRequest(
                        sessionData = it.sessionSetupResponse.sessionData,
                        paymentData = null,
                        details = json
                    )
                    var response: SessionDetailsResponse
                    try {
                        response = sessionService.submitDetails(
                            request = request,
                            sessionId = it.sessionSetupResponse.id,
                            clientKey = clientKey
                        )
                    } catch (e: java.lang.Exception) {
                        sendErrorEvent(e)
                        return@launch
                    }

                    sendFinishEvent(response)
                }
            }
    }

    override fun setOnRedirectListener(listener: () -> Unit) {
        throw NotImplementedError("This is base class")
    }

    protected fun setupRootConfig(json: ReadableMap): RootConfigurationParser {
        val config = RootConfigurationParser(json)
        this.environment = config.environment
        this.clientKey = config.clientKey ?: throw ModuleException.NoClientKey()
        this.locale = config.locale ?: currentLocale(reactApplicationContext)
        return config
    }

    protected fun cleanup() {
        session = null
        AdyenCheckout.removeActivityResultHandlingComponent()
        AdyenCheckout.removeIntentHandler()
        AdyenCheckout.removeDropInListener()
        CheckoutProxy.shared.componentListener = null
    }

    companion object {
        const val DID_COMPLETE = "didCompleteCallback"
        const val DID_PROVIDE = "didProvideCallback"
        const val DID_FAILED = "didFailCallback"
        const val DID_SUBMIT = "didSubmitCallback"

        @JvmStatic
        protected var session: CheckoutSession? = null

        private const val REDIRECT_RESULT_SCHEME =
            BuildConfig.adyenReactNativeRedirectScheme + "://"

        fun getReturnUrl(context: Context): String {
            return REDIRECT_RESULT_SCHEME + context.packageName
        }
    }
}
