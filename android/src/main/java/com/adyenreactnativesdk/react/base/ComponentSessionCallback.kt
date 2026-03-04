package com.adyenreactnativesdk.react.base

import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.uimanager.ThemedReactContext

class ComponentSessionCallback<T : PaymentComponentState<*>>(
  private val messageBus: MessageBus,
  private val onActionCallback: (Action) -> Unit,
  private val componentId: String,
) : SessionComponentCallback<T> {
  override fun onAction(action: Action) {
    onActionCallback(action)
  }

  override fun onFinished(result: SessionPaymentResult) {
    messageBus.onFinished(result)
  }

  override fun onError(componentError: ComponentError) {
    messageBus.onSessionException(componentError.exception)
  }
}