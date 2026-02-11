package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.dropin.SessionDropInService
import com.adyenreactnativesdk.AdyenPaymentPackage

class SessionCheckoutService : SessionDropInService() {
  override fun onCreate() {
    super.onCreate()
    DropInModule.sessionService = this
  }

  override fun onAddressLookupQueryChanged(query: String) {
    AdyenPaymentPackage.messageBus.onQueryChanged(query)
  }

  override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean =
    AdyenPaymentPackage.messageBus.onLookupCompletion(lookupAddress)

  override fun onBinLookup(data: List<BinLookupData>) {
    AdyenPaymentPackage.messageBus.onBinLookup(data)
  }

  override fun onBinValue(binValue: String) {
    AdyenPaymentPackage.messageBus.onBinValue(binValue)
  }
}
