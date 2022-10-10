package com.adyenreactnativesdk.component.googlepay

import android.content.Intent
import android.util.Log
import androidx.fragment.app.DialogFragment
import com.adyen.checkout.components.PaymentComponentState
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.core.api.Environment
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyenreactnativesdk.ActionHandler
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONException
import java.lang.ref.WeakReference
import java.util.*

class AdyenGooglePayComponent(context: ReactApplicationContext?) : BaseModule(context) {

    private var googlePayComponent: GooglePayComponent? = null

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData)
        if (paymentMethods == null) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("$TAG: can not deserialize paymentMethods")
            )
            return
        }

        val paymentMethod = getPaymentMethod(paymentMethods, PAYMENT_METHOD_KEY)
        if (paymentMethod == null) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("${TAG}: can not parse payment methods")
            )
            return
        }

        val type = paymentMethod.type
        if (paymentMethod == null || type.isNullOrEmpty()) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("$TAG: can not parse payment methods")
            )
            return
        }

        val rootConfigurationParser = RootConfigurationParser(configuration)
        val environment: Environment
        val clientKey: String
        val shopperLocale: Locale

        try {
            environment = rootConfigurationParser.environment
            clientKey = rootConfigurationParser.clientKey
            shopperLocale = rootConfigurationParser.locale ?: currentLocale(reactApplicationContext)
        } catch (e: NoSuchFieldException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
            return
        }

        val amount = rootConfigurationParser.amount
        val countryCode = rootConfigurationParser.countryCode
        if (amount == null || countryCode == null) {
            sendEvent(
                DID_FAILED,
                ReactNativeError.mapError("$TAG: configuration must contain amount and country code")
            )
            return
        }

        val parser = GooglePayConfigurationParser(configuration)
        val configBuilder = GooglePayConfiguration.Builder(
            shopperLocale,
            environment,
            clientKey
        )
            .setCountryCode(countryCode)
            .setAmount(amount)
        val googlePayConfiguration = parser.getConfiguration(configBuilder)

        GooglePayComponent.PROVIDER.isAvailable(
            appCompatActivity.application,
            paymentMethod,
            googlePayConfiguration
        ) { isAvailable: Boolean, paymentMethod: PaymentMethod, config: GooglePayConfiguration? ->
            if (isAvailable) {
                val component = GooglePayComponent.PROVIDER.get(
                    appCompatActivity,
                    paymentMethod,
                    googlePayConfiguration
                )
                googlePayComponent = component
                shared = this
                component.observe(appCompatActivity) { googlePayComponentState ->
                    if (googlePayComponentState?.isValid == true) {
                        onSubmit(googlePayComponentState.data)
                    }
                }
                component.observeErrors(appCompatActivity) { componentError ->
                    onError(componentError.exception)
                }
                component.startGooglePayScreen(
                    appCompatActivity,
                    GOOGLEPAY_REQUEST_CODE
                )
            } else {
                sendEvent(
                    DID_FAILED,
                    ReactNativeError.mapError("$TAG: GooglePay unavailable")
                )
            }
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        googlePayComponent = null
        shared = null
    }

    fun onError(error: Exception) {
        val errorMap = ReactNativeError.mapError(error)
        sendEvent(DID_FAILED, errorMap)
    }

    fun onSubmit(data: PaymentComponentData<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
        try {
            val map: WritableMap = ReactNativeJson.convertJsonToMap(jsonObject)
            map.putString("returnUrl", ActionHandler.getReturnUrl(reactApplicationContext))
            sendEvent(DID_SUBMIT, map)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    fun manageState(resultCode: Int, data: Intent?) {
        Log.d(TAG, "handleState called - $resultCode")
        googlePayComponent?.handleActivityResult(resultCode, data)
    }

    companion object {
        private const val TAG = "GooglePayComponent"
        private const val COMPONENT_NAME = "AdyenGooglePay"
        private const val GOOGLEPAY_REQUEST_CODE = 1001
        private const val PAYMENT_METHOD_KEY = "paywithgoogle"

        private var shared: AdyenGooglePayComponent? = null

        @JvmStatic
        fun handleState(requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == GOOGLEPAY_REQUEST_CODE) {
                shared?.manageState(resultCode, data)
            }
        }
    }

}
