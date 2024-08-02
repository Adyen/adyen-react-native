package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.dropin.SessionDropInService
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy

class SessionCheckoutService : SessionDropInService() {

    override fun onCreate() {
        super.onCreate()
        CheckoutProxy.shared.sessionService = this
    }

    override fun onAddressLookupQueryChanged(query: String) {
        AdyenCheckout.addressLookupCallback.get()?.onQueryChanged(query)
    }

    override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean {
        return AdyenCheckout.addressLookupCallback.get()?.onLookupCompletion(lookupAddress) ?: false
    }
}