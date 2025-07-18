/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import android.util.Log
import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.dropin.DropInService
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.CheckoutProxy.CardComponentEventListener

open class AdvancedCheckoutService : DropInService() {

    override fun onCreate() {
        super.onCreate()
        CheckoutProxy.shared.advancedService = this
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
        listener?.onAdditionalDetails(actionComponentData)
            ?: Log.e(
                TAG,
                "Invalid state: DropInServiceListener is missing"
            )
    }

    override fun onAddressLookupQueryChanged(query: String) {
        val listener = CheckoutProxy.shared.componentListener as? AddressLookupCallback
        listener?.onQueryChanged(query)
    }

    override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean {
        val listener = CheckoutProxy.shared.componentListener as? AddressLookupCallback
        return listener?.onLookupCompletion(lookupAddress) ?: false
    }

    override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
        val listener = CheckoutProxy.shared.componentListener
        listener?.onBalanceCheck(paymentComponentState)
    }

    override fun onOrderRequest() {
        val listener = CheckoutProxy.shared.componentListener
        listener?.onOrderRequest()
    }

    override fun onOrderCancel(order: Order, shouldUpdatePaymentMethods: Boolean) {
        val listener = CheckoutProxy.shared.componentListener
        listener?.onOrderCancel(order, shouldUpdatePaymentMethods)
    }

    override fun onBinLookup(data: List<BinLookupData>) {
        val listener = CheckoutProxy.shared.componentListener as? CardComponentEventListener
        listener?.onBinLookup(data)
    }

    override fun onBinValue(binValue: String) {
        val listener = CheckoutProxy.shared.componentListener as? CardComponentEventListener
        listener?.onBinValue(binValue)
    }

    override fun onRemoveStoredPaymentMethod(storedPaymentMethod: StoredPaymentMethod) {
        val listener = CheckoutProxy.shared.componentListener as? CardComponentEventListener
        listener?.onRemove(storedPaymentMethod)
    }

    companion object {
        private const val TAG = "AdyenDropInService"
    }
}