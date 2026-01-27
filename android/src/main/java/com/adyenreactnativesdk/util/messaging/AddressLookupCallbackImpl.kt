package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.google.gson.Gson
import org.json.JSONObject

class AddressLookupCallbackImpl(
  private val emitter: MessageBusEmitter,
  private val gson: Gson,
) : AddressLookupCallback {
  override fun onQueryChanged(query: String) {
    emitter.sendEvent(EventName.UPDATE_ADDRESS, query)
  }

  override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean {
    val jsonString = gson.toJson(lookupAddress)
    val jsonObject = JSONObject(jsonString)
    emitter.sendEvent(EventName.CONFIRM_ADDRESS, jsonObject)
    return true
  }
}
