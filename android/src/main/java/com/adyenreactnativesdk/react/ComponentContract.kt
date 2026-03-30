package com.adyenreactnativesdk.react

import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.action.Action

interface ComponentContract {
  fun onAction(action: Action)

  fun onAddressLookupResult(result: AddressLookupResult)

  fun onAddressLookupOptions(options: List<LookupAddress>)
}
