/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.annotation.SuppressLint
import com.adyen.checkout.components.core.internal.data.api.AnalyticsMapper
import com.adyen.checkout.components.core.internal.data.api.AnalyticsPlatform
import com.adyenreactnativesdk.component.SessionHelperModule
import com.adyenreactnativesdk.component.applepay.ApplePayModuleMock
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.component.googlepay.GooglePayModule
import com.adyenreactnativesdk.component.instant.InstantModule
import com.adyenreactnativesdk.cse.ActionModule
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
        configureAnalytics()
        return listOf(
            DropInModule(reactContext),
            InstantModule(reactContext),
            GooglePayModule(reactContext),
            ApplePayModuleMock(reactContext),
            AdyenCSEModule(reactContext),
            SessionHelperModule(reactContext),
            ActionModule(reactContext),
        )
    }

    // This is intended.
    @SuppressLint("RestrictedApi")
    private fun configureAnalytics() {
        val version = BuildConfig.CHECKOUT_VERSION
        AnalyticsMapper.overrideForCrossPlatform(AnalyticsPlatform.REACT_NATIVE, version)
    }
}