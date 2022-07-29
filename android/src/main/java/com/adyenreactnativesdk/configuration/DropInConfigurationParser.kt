package com.adyenreactnativesdk.configuration

import com.facebook.react.bridge.ReadableMap

class DropInConfigurationParser(config: ReadableMap) {

    companion object {
        const val TAG = "DropInConfigurationParser"
        const val DROPIN_KEY = "dropin"
        const val SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY = "showPreselectedStoredPaymentMethod"
        const val SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY = "skipListWhenSinglePaymentMethod"
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(DROPIN_KEY)) {
            this.config = config.getMap(DROPIN_KEY)!!
        } else {
            this.config = config
        }
    }

    val skipListWhenSinglePaymentMethod: Boolean
        get() = if (config.hasKey(SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY)) {
            config.getBoolean(SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY)
        } else false

    val showPreselectedStoredPaymentMethod: Boolean
        get() = if (config.hasKey(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY)) {
            config.getBoolean(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY)
        } else true

}