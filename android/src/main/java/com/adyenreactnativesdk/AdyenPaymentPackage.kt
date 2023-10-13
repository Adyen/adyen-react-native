/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk

import com.adyenreactnativesdk.component.applepay.AdyenApplePayMock
import com.adyenreactnativesdk.component.dropin.AdyenDropInComponent
import com.adyenreactnativesdk.component.googlepay.AdyenGooglePayComponent
import com.adyenreactnativesdk.component.instant.AdyenInstantComponent
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AdyenPaymentPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        val modules: MutableList<NativeModule> = ArrayList()
        modules.add(AdyenDropInComponent(reactContext))
        modules.add(AdyenInstantComponent(reactContext))
        modules.add(AdyenGooglePayComponent(reactContext))
        modules.add(AdyenApplePayMock(reactContext))
        modules.add(AdyenCSEModule(reactContext))
        return modules
    }
}