package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.dropin.DropInConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.sessions.core.SessionPaymentResult
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
        val config = setupRootConfig(json)
        val builder = DropInConfiguration.Builder(locale, environment, clientKey)
        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())

        return builder.build()
    }

    override fun getName(): String {
        return "SessionHelper"
    }

    override fun onFinished(result: SessionPaymentResult) {
        throw NotImplementedError("This Module have no events")
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