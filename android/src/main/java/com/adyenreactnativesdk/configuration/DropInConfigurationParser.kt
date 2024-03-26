/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.dropin.DropInConfiguration
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

    internal val skipListWhenSinglePaymentMethod: Boolean?
        get() = if (config.hasKey(SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY)) {
            config.getBoolean(SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY)
        } else null

    internal val showPreselectedStoredPaymentMethod: Boolean?
        get() = if (config.hasKey(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY)) {
            config.getBoolean(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY)
        } else null

    fun applyConfiguration(builder: DropInConfiguration.Builder) {
        showPreselectedStoredPaymentMethod?.let { builder.setShowPreselectedStoredPaymentMethod(it) }
        skipListWhenSinglePaymentMethod?.let { builder.setSkipListWhenSinglePaymentMethod(it) }
    }

}