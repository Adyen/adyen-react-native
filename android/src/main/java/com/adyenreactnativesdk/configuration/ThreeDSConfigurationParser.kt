package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.facebook.react.bridge.ReadableMap

class ThreeDSConfigurationParser(config: ReadableMap) {
    companion object {
        const val TAG = "ThreeDSConfigurationParser"
        const val THREEDS2_KEY = "threeDS2"
        const val THREEDS2_REQUESTOR_APP_URL_KEY = "requestorAppUrl"
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(THREEDS2_KEY)) {
            this.config = config.getMap(THREEDS2_KEY)!!
        } else {
            this.config = config
        }
    }

    val requestorAppUrl: String?
        get() = if (config.hasKey(THREEDS2_REQUESTOR_APP_URL_KEY)) {
            config.getString(THREEDS2_REQUESTOR_APP_URL_KEY)
        } else null

    fun applyConfiguration(builder: Adyen3DS2Configuration.Builder) {
        requestorAppUrl?.let { builder.setThreeDSRequestorAppURL(it) }
    }
}