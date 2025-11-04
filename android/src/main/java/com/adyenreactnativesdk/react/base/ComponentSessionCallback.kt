package com.adyenreactnativesdk.react.base

import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyen.checkout.sessions.core.SessionPaymentResult

abstract class ComponentSessionCallback<T : PaymentComponentState<*>>(
private val componentId: String) : SessionComponentCallback<T> {
  override fun onAction(action: Action) {

  }

  override fun onFinished(result: SessionPaymentResult) {

  }

  override fun onError(componentError: ComponentError) {

  }
}

