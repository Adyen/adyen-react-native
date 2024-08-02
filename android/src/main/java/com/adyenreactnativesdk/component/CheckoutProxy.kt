/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component

import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.dropin.BaseDropInServiceContract
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.lang.ref.WeakReference

class CheckoutProxy private constructor() {
    private var _componentListener = WeakReference<ComponentEventListener>(null)

    var sessionService: BaseDropInServiceContract? = null

    var advancedService: BaseDropInServiceContract? = null

    var componentListener: ComponentEventListener?
        get() = _componentListener.get()
        set(value) {
            _componentListener = WeakReference(value)
        }

    /** All events coming from Android SDK */
    interface ComponentEventListener {
        fun onSubmit(state: PaymentComponentState<*>)
        fun onAdditionalData(jsonObject: JSONObject)
        fun onException(exception: CheckoutException)
        fun onFinished(result: SessionPaymentResult)
    }

    companion object {
        var shared = CheckoutProxy()
    }
}