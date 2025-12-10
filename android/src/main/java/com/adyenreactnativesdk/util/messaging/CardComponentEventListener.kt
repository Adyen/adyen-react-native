package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.card.BinLookupData

/** Events coming from Card Component */
interface CardComponentEventListener {
  fun onBinValue(binValue: String)

  fun onBinLookup(data: List<BinLookupData>)
}
