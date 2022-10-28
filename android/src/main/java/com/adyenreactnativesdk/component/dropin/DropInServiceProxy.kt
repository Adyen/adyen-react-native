/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.lang.ref.WeakReference

class DropInServiceProxy private constructor() {
    private var _serviceListener = WeakReference<DropInServiceListener>(null)
    private var _moduleListener = WeakReference<DropInModuleListener>(null)

    var serviceListener: DropInServiceListener?
        get() = _serviceListener.get()
        set(value) {
            _serviceListener = WeakReference(value)
        }

    var moduleListener: DropInModuleListener?
        get() = _moduleListener.get()
        set(value) {
            _moduleListener = WeakReference(value)
        }

    interface DropInServiceListener {
        fun onDidSubmit(jsonObject: JSONObject)
        fun onDidProvide(jsonObject: JSONObject)
    }

    interface DropInModuleListener {
        fun onAction(jsonObject: JSONObject)
        fun onFail(map: ReadableMap?)
        fun onComplete(message: String)
    }

    companion object {
        var shared = DropInServiceProxy()
    }
}