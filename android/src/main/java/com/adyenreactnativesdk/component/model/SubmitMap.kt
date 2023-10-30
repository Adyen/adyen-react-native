package com.adyenreactnativesdk.component.model

import org.json.JSONObject

data class SubmitMap(val paymentData: JSONObject, val extra: JSONObject?) {
    fun toJSONObject(): JSONObject {
        return JSONObject().apply {
            put(PAYMENT_DATA_KEY, paymentData)
            put(EXTRA_KEY, extra)
        }
    }

    companion object {
        const val PAYMENT_DATA_KEY = "paymentData"
        const val EXTRA_KEY = "extra"
    }
}
