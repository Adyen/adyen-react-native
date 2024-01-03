/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
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
        val instantPaymentConfiguration: InstantPaymentConfiguration
        val paymentMethod: PaymentMethod
        try {
            instantPaymentConfiguration =
                parseConfiguration(configuration) as InstantPaymentConfiguration
            paymentMethod =
                getPaymentMethodsApiResponse(paymentMethodsData).paymentMethods?.firstOrNull()
                    ?: throw ModuleException.InvalidPaymentMethods(null)
        } catch (e: Exception) {
            return sendErrorEvent(e)
        }

        CheckoutProxy.shared.componentListener = this
        InstantFragment.show(
            appCompatActivity.supportFragmentManager,
            instantPaymentConfiguration,
            paymentMethod,
            session
        )
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
        cleanup()
        InstantFragment.hide(appCompatActivity.supportFragmentManager)
    }

    override fun parseConfiguration(json: ReadableMap): Configuration {
        val config = setupRootConfig(json)

        val instantPaymentConfiguration = InstantPaymentConfiguration.Builder(locale, environment, clientKey)
        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())

        return instantPaymentConfiguration.build()
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenInstant"
    }

}

