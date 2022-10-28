/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.card

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyen.checkout.components.model.payments.Amount
import com.adyenreactnativesdk.configuration.CardConfigurationParser
import com.adyen.checkout.card.CardConfiguration
import org.json.JSONException
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.DialogFragment
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.card.CardView
import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.core.api.Environment
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.action.ActionHandlerConfiguration
import com.adyenreactnativesdk.action.ActionHandlingInterface
import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.ui.ComponentViewModel
import com.adyenreactnativesdk.ui.PaymentComponentListener
import com.adyenreactnativesdk.ui.AdyenBottomSheetDialogFragment
import com.adyenreactnativesdk.util.ReactNativeError
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.WritableMap
import java.lang.Exception
import java.lang.ref.WeakReference
import java.util.*

class AdyenCardComponent(context: ReactApplicationContext?) : BaseModule(context),
    PaymentComponentListener, ActionHandlingInterface {
    private var dialog: WeakReference<DialogFragment> = WeakReference(null)

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
                ReactNativeError.mapError("$TAG: can not parse payment methods")
            )
            return
        }

        val config = RootConfigurationParser(configuration)
        val environment = config.environment
        val clientKey = config.clientKey
        val shopperLocale = config.locale ?: currentLocale(reactApplicationContext)
        val amount = config.amount

        val actionHandlerConfiguration =
            ActionHandlerConfiguration(shopperLocale, environment, clientKey!!)
        actionHandler = ActionHandler(this, actionHandlerConfiguration)

        val parser = CardConfigurationParser(configuration)
        val componentConfiguration: CardConfiguration
        val builder = CardConfiguration.Builder(shopperLocale, environment, clientKey)
        componentConfiguration = parser.getConfiguration(builder)

        val theActivity = appCompatActivity
        val viewModel = ComponentViewModel(
            paymentMethod,
            shopperLocale,
            amount
        )
        viewModel.listener = this
        theActivity.runOnUiThread {
            showComponentView(
                theActivity,
                viewModel,
                componentConfiguration
            )
        }
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            actionHandler?.handleAction(appCompatActivity, action)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        val dialogFragment = dialog.get() ?: return
        Log.d(TAG, "Closing component")
        dialogFragment.dismiss()
        actionHandler = null
    }

    private fun showComponentView(
        theActivity: AppCompatActivity,
        viewModel: ComponentViewModel,
        configuration: CardConfiguration
    ) {
        val componentView = CardView(theActivity)
        val component: CardComponent = CardComponent.PROVIDER
            .get<AppCompatActivity>(theActivity, viewModel.paymentMethod, configuration)
        val fragmentManager = theActivity.supportFragmentManager
        val componentDialog =
            AdyenBottomSheetDialogFragment(
                viewModel,
                componentView,
                component
            )
        componentDialog.show(fragmentManager, "Component")
        dialog = WeakReference<DialogFragment>(componentDialog)
    }

    override fun onError(error: Exception) {
        val errorMap = ReactNativeError.mapError(error)
        sendEvent(DID_FAILED, errorMap)
    }

    override fun onSubmit(data: PaymentComponentData<*>) {
        val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
        try {
            val map: WritableMap = ReactNativeJson.convertJsonToMap(jsonObject)
            map.putString("returnUrl", ActionHandler.getReturnUrl(reactApplicationContext))
            Log.d(TAG, "Paying")
            sendEvent(DID_SUBMIT, map)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    override fun provide(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        try {
            val map = ReactNativeJson.convertJsonToMap(jsonObject)
            sendEvent(DID_PROVIDE, map)
        } catch (e: JSONException) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e))
        }
    }

    override fun onClose() {
        sendEvent(DID_FAILED, ReactNativeError.mapError("Closed"))
    }

    override fun onFinish() {
        sendEvent(DID_COMPLETE, null)
    }

    companion object {
        private const val PAYMENT_METHOD_KEY = "scheme"
        private const val TAG = "CardComponent"
        private const val COMPONENT_NAME = "AdyenCardComponent"
    }
}
