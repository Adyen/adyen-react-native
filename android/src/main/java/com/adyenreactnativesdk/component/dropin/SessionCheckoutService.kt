package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.dropin.SessionDropInService
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.CheckoutProxy.CardComponentEventListener

class SessionCheckoutService : SessionDropInService() {

    override fun onCreate() {
        super.onCreate()
        CheckoutProxy.shared.sessionService = this
    }

    override fun onAddressLookupQueryChanged(query: String) {
        val listener = CheckoutProxy.shared.componentListener as? AddressLookupCallback
        listener?.onQueryChanged(query)
    }

    override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean {
        val listener = CheckoutProxy.shared.componentListener as? AddressLookupCallback
        return listener?.onLookupCompletion(lookupAddress) ?: false
    }

    override fun onBinLookup(data: List<BinLookupData>) {
        val listener = CheckoutProxy.shared.componentListener as? CardComponentEventListener
        listener?.onBinLookup(data)
    }

    override fun onBinValue(binValue: String) {
        val listener = CheckoutProxy.shared.componentListener as? CardComponentEventListener
        listener?.onBinValue(binValue)
    }
}