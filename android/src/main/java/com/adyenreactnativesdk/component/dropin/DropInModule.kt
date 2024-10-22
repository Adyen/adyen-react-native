/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.BalanceResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.dropin.AddressLookupDropInServiceResult
import com.adyen.checkout.dropin.BalanceDropInServiceResult
import com.adyen.checkout.dropin.BaseDropInServiceContract
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInServiceResult
import com.adyen.checkout.dropin.ErrorDialog
import com.adyen.checkout.dropin.OrderDropInServiceResult
import com.adyen.checkout.dropin.RecurringDropInServiceResult
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
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.google.gson.Gson
import org.json.JSONObject

class DropInModule(context: ReactApplicationContext?) : BaseModule(context), ReactDropInCallback,
    AddressLookupCallback {

    private fun getService(): BaseDropInServiceContract? {
        return if (session != null) CheckoutProxy.shared.sessionService else CheckoutProxy.shared.advancedService
    }

    private var storedPaymentMethodID: String? = null

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
        CheckoutProxy.shared.addressLookupCallback = this
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
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            listener.sendResult(DropInServiceResult.Action(action))
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

    @ReactMethod
    fun update(results: ReadableArray?) {
        if (results == null) return
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }

        try {
            val jsonString = ReactNativeJson.convertArrayToJson(results).toString()
            val addresses = Gson().fromJson(jsonString, Array<LookupAddress>::class.java)
            val result = AddressLookupDropInServiceResult.LookupResult(addresses.toList())
            listener.sendAddressLookupResult(result)
        } catch (error: Throwable) {
            Log.w(TAG, error)
            val result = AddressLookupDropInServiceResult.LookupResult(
                arrayListOf()
            )
            listener.sendAddressLookupResult(result)
        }
    }

    @ReactMethod
    fun confirm(success: Boolean, address: ReadableMap?) {
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }

        if (success) {
            try {
                val jsonString = ReactNativeJson.convertMapToJson(address).toString()
                val lookupAddress = Gson().fromJson(jsonString, LookupAddress::class.java)
                listener.sendAddressLookupResult(
                    AddressLookupDropInServiceResult.LookupComplete(
                        lookupAddress
                    )
                )
            } catch (error: Throwable) {
                listener.sendAddressLookupResult(
                    AddressLookupDropInServiceResult.Error(
                        ErrorDialog(
                            message = error.localizedMessage
                        ), null, false
                    )
                )
            }
        } else {
            val error = address?.getString("message")?.let { ErrorDialog(message = it) }
            listener.sendAddressLookupResult(
                AddressLookupDropInServiceResult.Error(
                    error,
                    null,
                    false
                )
            )
        }
    }

    @ReactMethod
    fun removeStored(success: Boolean) {
        val successfulResult = if (success) storedPaymentMethodID?.let {
            RecurringDropInServiceResult.PaymentMethodRemoved(it)
        }
        else null

        val result = successfulResult ?: RecurringDropInServiceResult.Error(null, null, false)
        CheckoutProxy.shared.advancedService?.sendRecurringResult(result)
    }

    @ReactMethod
    fun provideBalance(success: Boolean, balance: ReadableMap?, error: ReadableMap?) {
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }
        if (success) {
            val jsonObject = ReactNativeJson.convertMapToJson(balance)
            val balanceResult = BalanceResult.SERIALIZER.deserialize(jsonObject)
            listener.sendBalanceResult(BalanceDropInServiceResult.Balance(balanceResult))
        } else {
            val message = error?.getString(AdyenConstants.PARAMETER_MESSAGE)
            listener.sendBalanceResult(BalanceDropInServiceResult.Error(null, message, false)  )
        }
    }

    @ReactMethod
    fun provideOrder(success: Boolean, order: ReadableMap?, error: ReadableMap?) {
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }
        if (success) {
            val jsonObject = ReactNativeJson.convertMapToJson(order)
            val orderResponse = OrderResponse.SERIALIZER.deserialize(jsonObject)
            listener.sendOrderResult(OrderDropInServiceResult.OrderCreated(orderResponse))
        } else {
            val message = error?.getString(AdyenConstants.PARAMETER_MESSAGE)
            listener.sendOrderResult(OrderDropInServiceResult.Error(null, message, false)  )
        }
    }

    @ReactMethod
    fun providePaymentMethods(paymentMethods: ReadableMap, order: ReadableMap?) {
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }
        val pmJsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
        val paymentMethods = PaymentMethodsApiResponse.SERIALIZER.deserialize(pmJsonObject)
        val order = order?.let  {
            val jsonObject = ReactNativeJson.convertMapToJson(it)
            return@let OrderResponse.SERIALIZER.deserialize(jsonObject)
        }

        listener.sendResult(DropInServiceResult.Update(paymentMethods, order) )
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
        val listener = getService()
        if (listener == null) {
            sendErrorEvent(ModuleException.NoModuleListener(integration))
            return
        }
        val messageString = message?.getString(AdyenConstants.PARAMETER_MESSAGE)
        if (success && messageString != null) {
            listener.sendResult(DropInServiceResult.Finished(messageString))
        } else {
            listener.sendResult(DropInServiceResult.Error(null, messageString, true))
        }
    }

    companion object {
        private const val TAG = "DropInComponent"
        private const val COMPONENT_NAME = "AdyenDropIn"
        private const val THREEDS_CANCELED_MESSAGE = "Challenge canceled."
    }

    override fun onQueryChanged(query: String) {
        reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_UPDATE_ADDRESS, query)
    }

    override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean {
        val jsonString = Gson().toJson(lookupAddress)
        val jsonObject = JSONObject(jsonString)
        reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_CONFIRM_ADDRESS, ReactNativeJson.convertJsonToMap(jsonObject))
        return true
    }

    override fun onRemove(storedPaymentMethod: StoredPaymentMethod) {
        storedPaymentMethodID = storedPaymentMethod.id
        val jsonObject = StoredPaymentMethod.SERIALIZER.serialize(storedPaymentMethod)
        reactApplicationContext.getJSModule(RCTDeviceEventEmitter::class.java)
            .emit(DID_DISABLE_STORED_PAYMENT_METHOD, ReactNativeJson.convertJsonToMap(jsonObject))
    }
}

internal interface ReactDropInCallback {
    fun onCancel()
    fun onError(reason: String?)
    fun onCompleted(result: String)
    fun onFinished(result: SessionPaymentResult)
}