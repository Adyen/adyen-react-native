package com.adyenreactnativesdk.util.messaging.card

import com.adyen.checkout.card.BinLookupData

/** Events coming from Card Component */
interface CardMessenger {
  fun onBinValue(binValue: String)

  fun onBinLookup(data: List<BinLookupData>)
}
