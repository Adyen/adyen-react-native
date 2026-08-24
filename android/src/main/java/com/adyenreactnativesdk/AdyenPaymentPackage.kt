/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.annotation.SuppressLint
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatform
import com.adyen.checkout.core.common.internal.helper.CheckoutPlatformParams
import com.adyenreactnativesdk.component.ComponentModule
import com.adyenreactnativesdk.component.ContextModule
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.cse.ActionModule
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.adyenreactnativesdk.react.AdyenComponentViewManager
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AdyenPaymentPackage : ReactPackage {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> {
    ensureInitialized(reactContext)

    return listOf(
      AdyenComponentViewManager(emitter),
    )
  }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    ensureInitialized(reactContext)
    val sharedBus = messageBus
    configureAnalytics()
    return listOf(
      DropInModule(reactContext, sharedBus),
      ComponentModule(reactContext, sharedBus),
      AdyenCSEModule(reactContext),
      ContextModule(reactContext, sharedBus),
      ActionModule(reactContext),
    )
  }

  companion object {
    val messageBus: MessageBus
      get() = _messageBus ?: throw IllegalStateException("AdyenCheckout MessageBus is not initialized")

    val emitter: MessageBusEmitter
      get() = _emitter ?: throw IllegalStateException("AdyenCheckout MessageBusEmitter is not initialized")

    internal fun messageBusOrNull(): MessageBus? = _messageBus

    @Volatile
    private var _emitter: MessageBusEmitter? = null

    @Volatile
    private var _messageBus: MessageBus? = null

    @Volatile
    private var currentContextHashCode: Int = 0
    private val lock = Any()

    /**
     * Ensures the shared [MessageBusEmitter] and [MessageBus] are created
     * for the provided context. Re-creates them when the context changes
     * (e.g., after hot reload).
     */
    internal fun ensureInitialized(context: ReactApplicationContext) {
      synchronized(lock) {
        val contextHash = context.hashCode()
        if (_emitter != null && currentContextHashCode == contextHash) return
        val newEmitter = MessageBusEmitter(context)
        _emitter = newEmitter
        _messageBus = MessageBus(newEmitter)
        currentContextHashCode = contextHash
      }
    }
  }
}
