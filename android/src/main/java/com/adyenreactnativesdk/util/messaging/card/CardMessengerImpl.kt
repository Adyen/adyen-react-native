package com.adyenreactnativesdk.util.messaging.card

import com.adyen.checkout.card.BinLookupData
import com.adyenreactnativesdk.component.model.toJSONObject
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName

class CardMessengerImpl(
  private val emitter: Emitter,
) : CardMessenger {
  override fun onBinValue(binValue: String) {
    emitter.sendEvent(EventName.CHANGE_BIN_VALUE, binValue)
  }

  override fun onBinLookup(data: List<BinLookupData>) {
    if (data.isEmpty()) return
    val jsonObject = data.toJSONObject()
    emitter.sendEvent(EventName.BIN_LOOKUP, jsonObject)
  }
}
