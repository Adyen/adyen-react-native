package com.adyenreactnativesdk.component

import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.component.base.BaseModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SessionHelperModule(context: ReactApplicationContext?) : BaseModule(context) {

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */
    }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */
    }

    @ReactMethod
    fun open(paymentMethodsData: ReadableMap?, configuration: ReadableMap) { /* No UI */
    }

    @ReactMethod
    fun hide(success: Boolean, message: ReadableMap?) { /* No UI */
    }

    override fun getName(): String = COMPONENT_NAME

    override fun onFinished(result: SessionPaymentResult) {
        throw NotImplementedError("This Module have no events")
    }

    @ReactMethod
    fun createSession(
        sessionModelJSON: ReadableMap,
        configurationJSON: ReadableMap,
        promise: Promise
    ) {
        appCompatActivity.lifecycleScope.launch(Dispatchers.IO) {
            super.createSessionAsync(sessionModelJSON, configurationJSON, promise)
        }
    }

    companion object {
        private const val COMPONENT_NAME = "SessionHelper"
    }

}