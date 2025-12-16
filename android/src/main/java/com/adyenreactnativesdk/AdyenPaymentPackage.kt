/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.annotation.SuppressLint
import com.adyen.checkout.components.core.AddressData
import com.adyen.checkout.components.core.internal.analytics.AnalyticsPlatform
import com.adyen.checkout.components.core.internal.analytics.AnalyticsPlatformParams
import com.adyenreactnativesdk.component.MessageBusModule
import com.adyenreactnativesdk.component.SessionHelperModule
import com.adyenreactnativesdk.component.applepay.ApplePayModuleMock
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.component.googlepay.GooglePayModule
import com.adyenreactnativesdk.component.instant.InstantModule
import com.adyenreactnativesdk.component.model.AddressDataAdapter
import com.adyenreactnativesdk.cse.ActionModule
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.adyenreactnativesdk.react.CardViewManager
import com.adyenreactnativesdk.react.PlatformPayViewManager
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.google.gson.GsonBuilder

class AdyenPaymentPackage : ReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> {
    val messageBus = getOrCreateMessageBus(reactContext)
    val cardView = CardViewManager(messageBus)
    MessageBusModule.consumers[CardViewManager.NAME] = cardView

    return listOf(
      PlatformPayViewManager(),
      cardView,
    )
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    configureAnalytics()
    val messageBus = getOrCreateMessageBus(reactContext)

    return listOf(
      DropInModule(reactContext, messageBus, gson),
      InstantModule(reactContext, messageBus),
      GooglePayModule(reactContext, messageBus),
      ApplePayModuleMock(reactContext, messageBus),
      MessageBusModule(reactContext, messageBus),
      AdyenCSEModule(reactContext),
      SessionHelperModule(reactContext),
      ActionModule(reactContext),
    )
  }

  // This is intended.
  @SuppressLint("RestrictedApi")
  private fun configureAnalytics() {
    val version = BuildConfig.CHECKOUT_VERSION
    AnalyticsPlatformParams.overrideForCrossPlatform(AnalyticsPlatform.REACT_NATIVE, version)
  }

  companion object {
    public val messageBus: MessageBus
      get() {
        return _messageBus ?: throw Exception("AdyenCheckout MessageBus is not initialized")
      }

    @Volatile
    private var _messageBus: MessageBus? = null
    private val lock = Any()

    private fun getOrCreateMessageBus(context: ReactApplicationContext): MessageBus =
      _messageBus ?: synchronized(lock) {
        _messageBus ?: MessageBus(context, gson).also { _messageBus = it }
      }

    private val gson =
      GsonBuilder()
        .registerTypeAdapter(AddressData::class.java, AddressDataAdapter())
        .create()
  }
}
