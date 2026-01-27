package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.AddressLookupCallback
import com.facebook.react.bridge.ReactContext
import com.google.gson.Gson
import org.json.JSONObject

class MessageBus(
  private val gson: Gson,
  private val emitter: MessageBusEmitter,
) : SessionEventListener by SessionEventListenerImpl(emitter),
  AdvancedEventListener by AdvancedEventListenerImpl(emitter),
  DropInStoredPaymentEventListener by DropInStoredPaymentEventListenerImpl(emitter),
  CardComponentEventListener by CardComponentEventListenerImpl(emitter, gson),
  AddressLookupCallback by AddressLookupCallbackImpl(emitter, gson)
