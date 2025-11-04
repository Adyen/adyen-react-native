package com.adyenreactnativesdk.react.base

import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState

abstract class ComponentAdvancedCallback<T : PaymentComponentState<*>>(
  private val componentId: String,
) : ComponentCallback<T> {
  override fun onSubmit(state: T) {

  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {

  }

  override fun onError(componentError: ComponentError) {

  }
}
