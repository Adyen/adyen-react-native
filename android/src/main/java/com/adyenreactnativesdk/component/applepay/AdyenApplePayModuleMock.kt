package com.adyenreactnativesdk.component.applepay

import com.adyen.checkout.components.core.PaymentComponentState
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

class AdyenApplePayModuleMock(context: ReactApplicationContext?) : BaseModule(context) {
    override fun getName(): String {
        return COMPONENT_NAME
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        AssertionError("Not Implemented")
    }

    override fun onAdditionalData(jsonObject: JSONObject) {
        AssertionError("Not Implemented")
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenApplePay"
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        sendErrorEvent(ModuleException.NotSupported())
    }
}