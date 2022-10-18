/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.PaymentComponentState
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.dropin.service.DropInService
import com.adyen.checkout.dropin.service.DropInServiceResult
import com.adyenreactnativesdk.component.dropin.DropInServiceProxy.DropInModuleListener
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

class AdyenDropInService : DropInService(), DropInModuleListener {
    override fun onCreate() {
        super.onCreate()
        DropInServiceProxy.shared.setModuleListener(this)
    }

    override fun onPaymentsCallRequested(
        paymentComponentState: PaymentComponentState<*>,
        paymentComponentJson: JSONObject
    ) {
        val listener = DropInServiceProxy.shared.serviceListener
        listener?.onDidSubmit(paymentComponentJson)
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
        val message = map?.getString(MESSAGE_KEY)
        val description = map?.getString(DESCRIPTION_KEY)
        sendResult(DropInServiceResult.Error(message, description, true))
    }

    override fun onComplete(message: String) {
        sendResult(DropInServiceResult.Finished(message))
    }

    companion object {
        private const val TAG = "AdyenDropInService"
        private const val MESSAGE_KEY = "message"
        private const val DESCRIPTION_KEY = "description"
    }
}