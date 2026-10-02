/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.annotation.SuppressLint
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatform
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatformParams
import com.adyenreactnativesdk.cse.ActionModule
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.adyenreactnativesdk.react.AdyenComponentViewManager
import com.adyenreactnativesdk.react.AndroidCheckoutModule
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class AdyenPaymentPackage : BaseReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> =
    listOf(
      AdyenComponentViewManager(),
    )

  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? {
    configureAnalytics()
    return when (name) {
      AndroidCheckoutModule.NAME -> AndroidCheckoutModule(reactContext)
      AdyenCSEModule.NAME -> AdyenCSEModule(reactContext)
      ActionModule.NAME -> ActionModule(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        AndroidCheckoutModule.NAME to moduleInfo<AndroidCheckoutModule>(AndroidCheckoutModule.NAME, turbo = true),
        AdyenCSEModule.NAME to moduleInfo<AdyenCSEModule>(AdyenCSEModule.NAME, turbo = true),
        ActionModule.NAME to moduleInfo<ActionModule>(ActionModule.NAME, turbo = true),
      )
    }

  companion object {
    @Volatile
    var sdkVersion: String? = null
      internal set

    // This is intended.
    @SuppressLint("RestrictedApi")
    fun configureAnalytics() {
      sdkVersion?.let {
        CheckoutPlatformParams.overrideForCrossPlatform(CheckoutPlatform.REACT_NATIVE, it)
      }
    }

    private inline fun <reified T> moduleInfo(
      name: String,
      turbo: Boolean = false,
    ): ReactModuleInfo =
      ReactModuleInfo(
        name,
        T::class.java.name,
        false,
        false,
        false,
        turbo,
      )
  }
}
