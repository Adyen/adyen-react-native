package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.exception.CheckoutException
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.lang.ref.WeakReference

class CheckoutProxy private constructor() {
    private var _componentListener = WeakReference<ComponentEventListener>(null)
    private var _moduleListener = WeakReference<ModuleEventListener>(null)

    var componentListener: ComponentEventListener?
        get() = _componentListener.get()
        set(value) {
            _componentListener = WeakReference(value)
        }

    var moduleListener: ModuleEventListener?
        get() = _moduleListener.get()
        set(value) {
            _moduleListener = WeakReference(value)
        }

    interface ComponentEventListener {
        fun onSubmit(state: PaymentComponentState<*>)
        fun onAdditionalData(jsonObject: JSONObject)
        fun onException(exception: CheckoutException)
    }

    interface ModuleEventListener {
        fun onAction(jsonObject: JSONObject)
        fun onFail(map: ReadableMap?)
        fun onComplete(message: String)
    }

    companion object {
        var shared = CheckoutProxy()
    }
}