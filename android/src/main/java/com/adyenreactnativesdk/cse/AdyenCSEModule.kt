package com.adyenreactnativesdk.cse

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class AdyenCSEModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {

    @ReactMethod
    fun addListener(eventName: String?) { }

    @ReactMethod
    fun removeListeners(count: Int?) { }
    
    override fun getName(): String {
        return COMPONENT_NAME
    }

    @ReactMethod
    fun encryptCard(card: ReadableMap, publicKey: String) {
    }


    @ReactMethod
    fun encryptBin(bin: String, publicKey: String) {
    }

    companion object {
        private const val TAG = "AdyenCSE"
        private const val COMPONENT_NAME = "AdyenCSE"
    }
}