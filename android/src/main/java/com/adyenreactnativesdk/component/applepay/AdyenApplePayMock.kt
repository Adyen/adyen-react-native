package com.adyenreactnativesdk.component.applepay

import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.BaseModuleException
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class AdyenApplePayMock(context: ReactApplicationContext?) : BaseModule(context) {
    override fun getName(): String {
        return COMPONENT_NAME
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenApplePay"
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        sendErrorEvent(BaseModuleException.NotSupported())
    }
}