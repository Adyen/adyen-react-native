package com.adyenreactnativesdk.react.base

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyenreactnativesdk.util.MessageBus
import com.facebook.react.uimanager.ThemedReactContext

class ComponentAdvancedCallback<T : PaymentComponentState<*>>(
  private val context: ThemedReactContext,
  private val componentId: String,
) : ComponentCallback<T> {

  var messageBus = MessageBus(context)

  override fun onSubmit(state: T) {
    messageBus.onSubmit(state)
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    messageBus.onAdditionalDetails(actionComponentData)
  }

  override fun onError(componentError: ComponentError) {
    messageBus.onException(componentError.exception)
  }
}
