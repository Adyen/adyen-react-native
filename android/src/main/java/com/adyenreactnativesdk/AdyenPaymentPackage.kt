/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import com.adyenreactnativesdk.component.applepay.AdyenApplePayModuleMock
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.component.googlepay.GooglePayModule
import com.adyenreactnativesdk.component.instant.InstantModule
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
        modules.add(DropInModule(reactContext))
        modules.add(InstantModule(reactContext))
        modules.add(GooglePayModule(reactContext))
        modules.add(AdyenApplePayModuleMock(reactContext))
        modules.add(AdyenCSEModule(reactContext))
        return modules
    }
}