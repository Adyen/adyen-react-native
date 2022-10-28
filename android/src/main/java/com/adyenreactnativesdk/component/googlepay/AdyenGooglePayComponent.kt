package com.adyenreactnativesdk.component.googlepay

import android.content.Intent
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.ui.PendingPaymentDialogFragment
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONException

class AdyenGooglePayComponent(context: ReactApplicationContext?) : BaseModule(context) {

    private var googlePayComponent: GooglePayComponent? = null
    private var loadingDialogFragment: PendingPaymentDialogFragment? = null

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { }

    @ReactMethod
    fun removeListeners(count: Int?) { }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData)
        if (paymentMethods == null) {
            sendErrorEvent(BaseModuleException.InvalidPaymentMethods())
            return
        }

        val googlePayPaymentMethod = getPaymentMethod(paymentMethods, PAYMENT_METHOD_KEY)
        if (googlePayPaymentMethod == null) {
            sendErrorEvent(BaseModuleException.NoPaymentMethod(PAYMENT_METHOD_KEY))
            return
        }

        val rootParser = RootConfigurationParser(configuration)
        val environment = rootParser.environment
        val shopperLocale = rootParser.locale ?: currentLocale(reactApplicationContext)
        val clientKey: String
        rootParser.clientKey.let {
            clientKey = if (it != null) it else {
                sendErrorEvent(BaseModuleException.NoClientKey())
                return
            }
        }

        val amount = rootParser.amount
        val countryCode = rootParser.countryCode
        if (amount == null || countryCode == null) {
            sendErrorEvent(BaseModuleException.NoPayment())
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
            googlePayPaymentMethod,
            googlePayConfiguration
        ) { isAvailable: Boolean, paymentMethod: PaymentMethod, _: GooglePayConfiguration? ->
            loadingDialogFragment = PendingPaymentDialogFragment.newInstance()
            loadingDialogFragment?.showNow(appCompatActivity.supportFragmentManager, TAG)
            if (isAvailable) {
                val component = GooglePayComponent.PROVIDER.get(
                    appCompatActivity,
                    paymentMethod,
                    googlePayConfiguration
                )
                googlePayComponent = component
                shared = this
                loadingDialogFragment?.let {
                    component.observe(it) { googlePayComponentState ->
                        if (googlePayComponentState?.isValid == true) {
                            onSubmit(googlePayComponentState.data)
                        }
                    }
                    component.observeErrors(it) { componentError ->
                        onError(componentError.exception)
                    }
                }

                component.startGooglePayScreen(
                    appCompatActivity,
                    GOOGLEPAY_REQUEST_CODE
                )
            } else {
                sendErrorEvent(GooglePayException.NotSupported())
            }
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        googlePayComponent.remo
        googlePayComponent = null
        shared = null
        loadingDialogFragment?.dismiss()
        loadingDialogFragment = null
    }

    private fun onError(error: Exception) {
        sendErrorEvent(error)
    }

    private fun onSubmit(data: PaymentComponentData<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
        try {
            val map: WritableMap = ReactNativeJson.convertJsonToMap(jsonObject)
            map.putString(
                AdyenConstants.PARAMETER_RETURN_URL,
                ActionHandler.getReturnUrl(reactApplicationContext)
            )
            sendEvent(DID_SUBMIT, map)
        } catch (e: JSONException) {
            sendErrorEvent(e)
        }
    }

    fun manageState(resultCode: Int, data: Intent?) {
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

sealed class GooglePayException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class NotSupported : GooglePayException(
        code = "notSupported",
        message = "GooglePay unavailable"
    )
}


