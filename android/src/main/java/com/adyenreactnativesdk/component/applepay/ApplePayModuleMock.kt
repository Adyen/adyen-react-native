/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.applepay

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.core.exception.MethodNotImplementedException
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ApplePayModuleMock(context: ReactApplicationContext?) : BaseModule(context) {

    override fun getName(): String = COMPONENT_NAME

    companion object {
        private const val COMPONENT_NAME = "AdyenApplePay"
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap, configuration: ReadableMap) {
        sendErrorEvent(ModuleException.NotSupported())
    }
}