package com.adyenreactnativesdk.component.googlepay

import android.content.Intent
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.core.exception.ComponentException
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.configuration.GooglePayConfigurationParser
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.ui.PendingPaymentDialogFragment
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import org.json.JSONException

class AdyenGooglePayComponent(context: ReactApplicationContext?) : BaseModule(context) {

    private var googlePayComponent: GooglePayComponent? = null
    private var pendingPaymentDialogFragment: PendingPaymentDialogFragment? = null

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { }

    @ReactMethod
    fun removeListeners(count: Int?) { }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData) ?: return

        val googlePayPaymentMethod = getPaymentMethod(paymentMethods, PAYMENT_METHOD_KEYS)
        if (googlePayPaymentMethod == null) {
            sendErrorEvent(BaseModuleException.NoPaymentMethods(PAYMENT_METHOD_KEYS))
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
            if (!isAvailable) {
                sendErrorEvent(GooglePayException.NotSupported())
                return@isAvailable
            }

            val dialogFragment = PendingPaymentDialogFragment.newInstance()
            dialogFragment.showNow(appCompatActivity.supportFragmentManager, TAG)

            val component = GooglePayComponent.PROVIDER.get(
                dialogFragment,
                paymentMethod,
                googlePayConfiguration
            )
            component.observe(dialogFragment) { googlePayComponentState ->
                if (googlePayComponentState?.isValid == true) {
                    onSubmit(googlePayComponentState.data)
                }
            }
            component.observeErrors(dialogFragment) { componentError ->
                onError(componentError.exception)
            }
            component.startGooglePayScreen(
                appCompatActivity,
                GOOGLEPAY_REQUEST_CODE
            )

            AdyenCheckout.setGooglePayComponent(this)
            pendingPaymentDialogFragment = dialogFragment
            googlePayComponent = component
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        appCompatActivity.runOnUiThread {
            pendingPaymentDialogFragment?.let {
                googlePayComponent?.removeObservers(it)
                googlePayComponent?.removeErrorObservers(it)
            }
            pendingPaymentDialogFragment?.dismiss()
            pendingPaymentDialogFragment = null
            googlePayComponent = null
        }
        AdyenCheckout.removeGooglePayComponent()
    }

    private fun onError(error: Exception) {
        sendErrorEvent(
            if ((error as? ComponentException)?.message == "Payment canceled.")
                BaseModuleException.Canceled()
            else error
        )
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

    fun handleActivityResult(resultCode: Int, data: Intent?) {
        googlePayComponent?.handleActivityResult(resultCode, data)
    }

    companion object {
        private const val TAG = "GooglePayComponent"
        private const val COMPONENT_NAME = "AdyenGooglePay"
        internal const val GOOGLEPAY_REQUEST_CODE = 1001
        private val PAYMENT_METHOD_KEYS = setOf("paywithgoogle", "googlepay")

        @JvmStatic
        @Deprecated(
            message = "This method is deprecated on beta-8",
            replaceWith = ReplaceWith("AdyenCheckout.handleActivityResult(requestCode, resultCode, data)"))
        fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
            AdyenCheckout.handleActivityResult(requestCode, resultCode, data)
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


