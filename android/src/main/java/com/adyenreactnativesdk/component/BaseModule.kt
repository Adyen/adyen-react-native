/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component

import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import com.adyen.checkout.components.model.PaymentMethodsApiResponse
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import org.json.JSONException
import java.util.*


abstract class BaseModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {

    protected fun sendEvent(eventName: String, map: ReadableMap?) {
        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(eventName, map)
    }

    protected fun getPaymentMethodsApiResponse(paymentMethods: ReadableMap?): PaymentMethodsApiResponse? {
        return try {
            val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
            PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
            return null
        }
    }

    protected fun getPaymentMethod(
        paymentMethodsResponse: PaymentMethodsApiResponse,
        paymentMethodName: String
    ): PaymentMethod? {
        for (currentPaymentMethod in paymentMethodsResponse.paymentMethods ?: emptyList())
            if (currentPaymentMethod.type == paymentMethodName) {
                return currentPaymentMethod
            }

        sendEvent(
            DID_FAILED,
            ReactNativeError.mapError("Payment methods does not contain $paymentMethodName")
        )
        return null
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
            val theActivity = currentActivity as AppCompatActivity?
            if (theActivity == null) {
                sendEvent(DID_FAILED, ReactNativeError.mapError("Not an AppCompact Activity"))
                throw Exception("Not an AppCompact Activity")
            }
            return theActivity
        }

    companion object {
        const val DID_COMPLETE = "didCompleteCallback"
        const val DID_PROVIDE = "didProvideCallback"
        const val DID_FAILED = "didFailCallback"
        const val DID_SUBMIT = "didSubmitCallback"
    }
}
