/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONException

class InstantModule(context: ReactApplicationContext?) : BaseModule(context), CheckoutProxy.ComponentEventListener {

    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        val paymentMethods = getPaymentMethodsApiResponse(paymentMethodsData)?.paymentMethods ?: return

        val paymentMethod = paymentMethods.firstOrNull()
        if (paymentMethod?.type == null) {
            sendErrorEvent(ModuleException.InvalidPaymentMethods(null))
            return
        }

        val config = RootConfigurationParser(configuration)
        val environment = config.environment
        val amount = config.amount
        val clientKey = config.clientKey.let {
            if (it != null) it else {
                sendErrorEvent(ModuleException.NoClientKey())
                return
            }
        }

        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())
        val shopperLocale = config.locale ?: currentLocale(reactApplicationContext)
        val instantPaymentConfiguration = InstantPaymentConfiguration.Builder(shopperLocale, environment, clientKey)
        amount?.let {
            instantPaymentConfiguration.setAmount(it)
        }
        CheckoutProxy.shared.componentListener = this
        InstantFragment.show(appCompatActivity.supportFragmentManager, instantPaymentConfiguration.build(), paymentMethod)
    }

    @ReactMethod
    fun handle(actionMap: ReadableMap?) {
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            InstantFragment.handle(appCompatActivity.supportFragmentManager, action)
        } catch (e: JSONException) {
            sendErrorEvent(ModuleException.InvalidAction(e))
        }
    }

    @ReactMethod
    fun hide(success: Boolean?, message: ReadableMap?) {
        InstantFragment.hide(appCompatActivity.supportFragmentManager)
        AdyenCheckout.removeIntentHandler()
        CheckoutProxy.shared.componentListener = null
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenInstant"
    }

}

