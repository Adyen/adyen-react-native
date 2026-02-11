package com.adyenreactnativesdk.util.messaging

import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyenreactnativesdk.util.messaging.address.AddressLookupMessengerImpl
import com.adyenreactnativesdk.util.messaging.base.AdvancedMessenger
import com.adyenreactnativesdk.util.messaging.base.AdvancedMessengerImpl
import com.adyenreactnativesdk.util.messaging.base.SessionMessenger
import com.adyenreactnativesdk.util.messaging.base.SessionMessengerImpl
import com.adyenreactnativesdk.util.messaging.card.CardMessenger
import com.adyenreactnativesdk.util.messaging.card.CardMessengerImpl
import com.adyenreactnativesdk.util.messaging.dropin.PartialPaymentMessenger
import com.adyenreactnativesdk.util.messaging.dropin.PartialPaymentMessengerImpl
import com.adyenreactnativesdk.util.messaging.dropin.RemoveStoredPaymentMessenger
import com.adyenreactnativesdk.util.messaging.dropin.RemoveStoredPaymentMessengerImpl

class MessageBus(
  emitter: Emitter,
) : SessionMessenger by SessionMessengerImpl(emitter),
  AdvancedMessenger by AdvancedMessengerImpl(emitter),
  PartialPaymentMessenger by PartialPaymentMessengerImpl(emitter),
  RemoveStoredPaymentMessenger by RemoveStoredPaymentMessengerImpl(emitter),
  CardMessenger by CardMessengerImpl(emitter),
  AddressLookupCallback by AddressLookupMessengerImpl(emitter)
