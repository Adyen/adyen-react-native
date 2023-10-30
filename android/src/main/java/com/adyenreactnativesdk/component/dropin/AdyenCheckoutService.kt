/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.card.CardComponentState
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.PaymentComponentState
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.dropin.service.DropInService
import com.adyen.checkout.dropin.service.DropInServiceResult
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyenreactnativesdk.component.dropin.DropInServiceProxy.DropInModuleListener
import com.adyenreactnativesdk.component.model.SubmitMap
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

open class AdyenCheckoutService : DropInService(), DropInModuleListener {
    override fun onCreate() {
        super.onCreate()
        DropInServiceProxy.shared.moduleListener = this
    }

    override fun onPaymentsCallRequested(
        paymentComponentState: PaymentComponentState<*>,
        paymentComponentJson: JSONObject
    ) {
        if (paymentComponentState is CardComponentState &&
            paymentComponentJson.getJSONObject(PAYMENT_DETAILS_KEY).isNull(BRAND_KEY)
        ) {
            val cardType = paymentComponentState.cardType?.txVariant
            paymentComponentJson.getJSONObject(PAYMENT_DETAILS_KEY).putOpt(BRAND_KEY, cardType)
        }

        var extra: JSONObject? = null
        if (paymentComponentState is GooglePayComponentState) {
            paymentComponentState.paymentData?.let {
                extra = JSONObject(it.toJson())
            }
        }
        val submitMap = SubmitMap(paymentComponentJson, extra)
        val listener = DropInServiceProxy.shared.serviceListener
        listener?.onDidSubmit(submitMap.toJSONObject())
            ?: Log.e(
                TAG,
                "Invalid state: DropInServiceListener is missing"
        )
    }

    override fun onDetailsCallRequested(
        actionComponentData: ActionComponentData,
        actionComponentJson: JSONObject
    ) {
        val listener = DropInServiceProxy.shared.serviceListener
        listener?.onDidProvide(actionComponentJson)
            ?: Log.e(
                TAG,
                "Invalid state: DropInServiceListener is missing"
        )
    }

    override fun onAction(jsonObject: JSONObject) {
        val action = Action.SERIALIZER.deserialize(jsonObject)
        sendResult(DropInServiceResult.Action(action))
    }

    override fun onFail(map: ReadableMap?) {
        val message = map?.getString(MESSAGE_KEY) ?: ""
        sendResult(DropInServiceResult.Finished(message)) // just hiding DropIn
    }

    override fun onComplete(message: String) {
        sendResult(DropInServiceResult.Finished(message))
    }

    companion object {
        private const val TAG = "AdyenDropInService"
        private const val MESSAGE_KEY = "message"
        private const val DESCRIPTION_KEY = "description"
        private const val BRAND_KEY = "brand"
        private const val PAYMENT_DETAILS_KEY = "paymentMethod"
    }
}