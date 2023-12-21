package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.dropin.DropInConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.RootConfigurationParser
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SessionHelperModule(context: ReactApplicationContext?) : BaseModule(context) {

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }

    override fun getName(): String {
        return "SessionHelper"
    }

    @ReactMethod
    fun createSession(
        sessionModelJSON: ReadableMap,
        configurationJSON: ReadableMap,
        promise: Promise
    ) {
        val myPluginScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        myPluginScope.launch {
            super.createSessionAsync(sessionModelJSON, configurationJSON, promise)
        }
    }

    @ReactMethod
    fun getReturnURL(promise: Promise) {
        promise.resolve(RedirectComponent.getReturnUrl(reactApplicationContext) + "/session")
    }

    override fun parseConfiguration(json: ReadableMap): Configuration {
        val config = RootConfigurationParser(json)
        val environment = config.environment
        val clientKey = config.clientKey ?: throw ModuleException.NoClientKey()
        return DropInConfiguration.Builder(this.reactApplicationContext, environment, clientKey).build()
    }

}