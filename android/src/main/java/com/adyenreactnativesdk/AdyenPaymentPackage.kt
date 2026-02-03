/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.annotation.SuppressLint
import com.adyen.checkout.components.core.AddressData
import com.adyen.checkout.components.core.internal.util.CheckoutPlatform
import com.adyen.checkout.components.core.internal.util.CheckoutPlatformParams
import com.adyenreactnativesdk.component.SessionHelperModule
import com.adyenreactnativesdk.component.applepay.ApplePayModuleMock
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.component.googlepay.GooglePayModule
import com.adyenreactnativesdk.component.instant.InstantModule
import com.adyenreactnativesdk.component.model.AddressDataAdapter
import com.adyenreactnativesdk.cse.ActionModule
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.adyenreactnativesdk.react.PlatformPayViewManager
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.google.gson.GsonBuilder

class AdyenPaymentPackage : ReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext) = listOf(PlatformPayViewManager())

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    val messageBus = getOrCreateMessageBus(reactContext)
    configureAnalytics()
    return listOf(
      DropInModule(reactContext, messageBus, gson),
      InstantModule(reactContext, messageBus),
      GooglePayModule(reactContext, messageBus),
      ApplePayModuleMock(reactContext, messageBus),
      AdyenCSEModule(reactContext),
      SessionHelperModule(reactContext, messageBus),
      ActionModule(reactContext),
    )
  }

  // This is intended.
  @SuppressLint("RestrictedApi")
  private fun configureAnalytics() {
    val version = BuildConfig.CHECKOUT_VERSION
    CheckoutPlatformParams.overrideForCrossPlatform(CheckoutPlatform.REACT_NATIVE, version)
  }

  companion object {
    val messageBus: MessageBus
      get() {
        return _messageBus ?: throw Exception("AdyenCheckout MessageBus is not initialized")
      }

    internal fun messageBusOrNull(): MessageBus? = _messageBus

    @Volatile
    private var _messageBus: MessageBus? = null

    @Volatile
    private var currentContextHashCode: Int = 0
    private val lock = Any()

    /**
     * Gets or creates a MessageBus for the provided context.
     * Creates a fresh instance if the context has changed (e.g., after hot reload).
     */
    internal fun getOrCreateMessageBus(context: ReactApplicationContext): MessageBus =
      synchronized(lock) {
        val contextHash = context.hashCode()
        if (_messageBus != null && currentContextHashCode == contextHash) {
          return@synchronized _messageBus!!
        }
        MessageBus(gson, MessageBusEmitter(context)).also {
          _messageBus = it
          currentContextHashCode = contextHash
        }
      }

    private val gson =
      GsonBuilder()
        .registerTypeAdapter(AddressData::class.java, AddressDataAdapter())
        .create()
  }
}
