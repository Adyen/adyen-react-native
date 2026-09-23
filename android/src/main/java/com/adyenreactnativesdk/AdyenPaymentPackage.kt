/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import com.adyenreactnativesdk.component.ComponentModule
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.dropin.DropInModule
import com.adyenreactnativesdk.cse.ActionModule
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.adyenreactnativesdk.react.AdyenComponentViewManager
import com.adyenreactnativesdk.react.AndroidCheckoutModule
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class AdyenPaymentPackage : TurboReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<in Nothing, in Nothing>> {
    ensureInitialized(reactContext)

    return listOf(
      AdyenComponentViewManager(emitter),
    )
  }

  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? {
    ensureInitialized(reactContext)
    BaseModule.configureAnalytics()
    return when (name) {
      AndroidCheckoutModule.NAME -> AndroidCheckoutModule(reactContext, messageBus)
      DROP_IN_MODULE_NAME -> DropInModule(reactContext, messageBus)
      COMPONENT_MODULE_NAME -> ComponentModule(reactContext, messageBus)
      CSE_MODULE_NAME -> AdyenCSEModule(reactContext)
      ACTION_MODULE_NAME -> ActionModule(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        AndroidCheckoutModule.NAME to moduleInfo<AndroidCheckoutModule>(AndroidCheckoutModule.NAME, turbo = true),
        DROP_IN_MODULE_NAME to moduleInfo<DropInModule>(DROP_IN_MODULE_NAME),
        COMPONENT_MODULE_NAME to moduleInfo<ComponentModule>(COMPONENT_MODULE_NAME),
        CSE_MODULE_NAME to moduleInfo<AdyenCSEModule>(CSE_MODULE_NAME),
        ACTION_MODULE_NAME to moduleInfo<ActionModule>(ACTION_MODULE_NAME),
      )
    }

  companion object {
    private const val DROP_IN_MODULE_NAME = "AdyenDropIn"
    private const val COMPONENT_MODULE_NAME = "AdyenComponent"
    private const val CSE_MODULE_NAME = "AdyenCSE"
    private const val ACTION_MODULE_NAME = "AdyenAction"

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
