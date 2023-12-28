package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.component.base.BaseModule
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

    override fun parseConfiguration(json: ReadableMap): Configuration {
        throw NotImplementedError("This Module have no configuration")
    }

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
        promise.resolve(RedirectComponent.getReturnUrl(reactApplicationContext))
    }

}