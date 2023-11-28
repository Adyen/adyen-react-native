/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.card.CardComponentState
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.dropin.DropInService
import com.adyen.checkout.dropin.DropInServiceResult

import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyenreactnativesdk.component.dropin.CheckoutProxy.ModuleEventListener
import com.adyenreactnativesdk.component.model.SubmitMap
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

open class AdyenCheckoutService : DropInService(), ModuleEventListener {

    override fun onCreate() {
        super.onCreate()
        CheckoutProxy.shared.moduleListener = this
    }

    override fun onSubmit(state: PaymentComponentState<*>) {
        val listener = CheckoutProxy.shared.componentListener
        listener?.onSubmit(state)
            ?: Log.e(
                TAG,
                "Invalid state: DropInServiceListener is missing"
            )
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val listener = CheckoutProxy.shared.componentListener
        val actionComponentJson = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        listener?.onAdditionalData(actionComponentJson)
            ?: Log.e(
                TAG,
                "Invalid state: DropInServiceListener is missing"
            )
    }

    fun onPaymentsCallRequested(
        paymentComponentState: PaymentComponentState<*>,
        paymentComponentJson: JSONObject
    ) {
        if (paymentComponentState is CardComponentState &&
            paymentComponentJson.getJSONObject(PAYMENT_DETAILS_KEY).isNull(BRAND_KEY)
        ) {
            val cardType = paymentComponentState.cardBrand?.txVariant
            paymentComponentJson.getJSONObject(PAYMENT_DETAILS_KEY).putOpt(BRAND_KEY, cardType)
        }
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