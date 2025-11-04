package com.adyenreactnativesdk.react.card

import com.adyen.checkout.card.CardComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.react.base.ComponentSessionCallback

internal class CardSessionCallback(
    private val componentId: String,
) : ComponentSessionCallback<CardComponentState>(componentId) {

}
