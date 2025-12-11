package com.adyenreactnativesdk.react.base

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyenreactnativesdk.util.messaging.MessageBus

class ComponentAdvancedCallback<T : PaymentComponentState<*>>(
  private val messageBus: MessageBus,
  private val componentId: String,
) : ComponentCallback<T> {
  override fun onSubmit(state: T) {
    messageBus.onSubmit(state, null)
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    messageBus.onAdditionalDetails(actionComponentData)
  }

  override fun onError(componentError: ComponentError) {
    messageBus.onException(componentError.exception)
  }
}
