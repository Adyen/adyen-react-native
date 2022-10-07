package com.adyenreactnativesdk.component.applepay

import com.adyenreactnativesdk.component.BaseModule
import com.adyenreactnativesdk.component.instant.AdyenInstantComponent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import java.lang.RuntimeException

class AdyenApplePayMock(context: ReactApplicationContext?) : BaseModule(context) {
    override fun getName(): String {
        return COMPONENT_NAME
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenApplePay"
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        throw RuntimeException("AdyenApplePay is not supported on Android!")
    }
}