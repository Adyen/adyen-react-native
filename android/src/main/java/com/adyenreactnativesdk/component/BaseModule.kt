/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component

import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyenreactnativesdk.BuildConfig
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import org.json.JSONException
import org.json.JSONObject
import java.util.*

abstract class BaseModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {

    protected fun sendEvent(eventName: String, map: ReadableMap?) {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, map)
    }

    protected fun sendEvent(eventName: String, jsonObject: JSONObject) {
        try {
            reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, ReactNativeJson.convertJsonToMap(jsonObject))
        } catch (e: JSONException) {
            sendErrorEvent(e)
        }
    }

    protected fun sendErrorEvent(error: Exception) {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_FAILED, ReactNativeError.mapError(error))
    }

    protected fun getPaymentMethodsApiResponse(paymentMethods: ReadableMap?): PaymentMethodsApiResponse? {
        return try {
            val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
            PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject)
        } catch (e: JSONException) {
            sendErrorEvent(BaseModuleException.InvalidPaymentMethods(e))
            return null
        }
    }

    protected fun getPaymentMethod(
        paymentMethodsResponse: PaymentMethodsApiResponse,
        paymentMethodNames: Set<String>
    ): PaymentMethod? {
        return paymentMethodsResponse.paymentMethods?.firstOrNull { paymentMethodNames.contains(it.type) }
    }

    protected fun getPaymentMethod(
        paymentMethodsResponse: PaymentMethodsApiResponse,
        paymentMethodName: String
    ): PaymentMethod? {
        return paymentMethodsResponse.paymentMethods?.firstOrNull { it.type == paymentMethodName }
    }

    protected fun currentLocale(context: Context): Locale {
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

    companion object {
        const val DID_COMPLETE = "didCompleteCallback"
        const val DID_PROVIDE = "didProvideCallback"
        const val DID_FAILED = "didFailCallback"
        const val DID_SUBMIT = "didSubmitCallback"

        const val REDIRECT_RESULT_SCHEME = BuildConfig.adyenReactNativeRedirectScheme + "://"
        fun getReturnUrl(context: Context): String {
            return REDIRECT_RESULT_SCHEME + context.packageName
        }
    }
}
