package com.adyenreactnativesdk.react.card

import com.adyen.checkout.card.CardComponentState
import com.adyenreactnativesdk.react.base.ComponentAdvancedCallback

internal class CardAdvancedCallback(
  private val componentId: String,
) : ComponentAdvancedCallback<CardComponentState>(componentId) { }
