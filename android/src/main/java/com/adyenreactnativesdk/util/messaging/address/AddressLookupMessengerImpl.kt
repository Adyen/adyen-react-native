package com.adyenreactnativesdk.util.messaging.address

import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyenreactnativesdk.component.model.toJSONObject
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName

class AddressLookupMessengerImpl(
  private val emitter: Emitter,
) : AddressLookupCallback {
  override fun onQueryChanged(query: String) {
    emitter.sendEvent(EventName.UPDATE_ADDRESS, query)
  }

  override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean {
    emitter.sendEvent(EventName.CONFIRM_ADDRESS, lookupAddress.toJSONObject())
    return true
  }
}
