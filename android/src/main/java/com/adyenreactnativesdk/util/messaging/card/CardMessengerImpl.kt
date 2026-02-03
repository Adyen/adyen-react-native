package com.adyenreactnativesdk.util.messaging.card

import com.adyen.checkout.card.BinLookupData
import com.adyenreactnativesdk.component.model.BinLookupDataDTO
import com.adyenreactnativesdk.util.messaging.Emitter
import com.adyenreactnativesdk.util.messaging.EventName
import com.google.gson.Gson
import org.json.JSONArray

class CardMessengerImpl(
  private val emitter: Emitter,
  private val gson: Gson,
) : CardMessenger {
  override fun onBinValue(binValue: String) {
    emitter.sendEvent(EventName.CHANGE_BIN_VALUE, binValue)
  }

  override fun onBinLookup(data: List<BinLookupData>) {
    if (data.isEmpty()) return
    val brandOnlyMap = data.map { BinLookupDataDTO(it.brand) }
    val jsonString = gson.toJson(brandOnlyMap)
    emitter.sendEvent(EventName.BIN_LOOKUP, JSONArray(jsonString))
  }
}
