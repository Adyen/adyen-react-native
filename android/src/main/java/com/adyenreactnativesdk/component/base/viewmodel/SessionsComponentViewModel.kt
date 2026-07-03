package com.adyenreactnativesdk.component.base.viewmodel

import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ModuleException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SessionsComponentViewModel<TState : PaymentComponentState<*>> :
  BaseViewModel<TState>(),
  SessionComponentCallback<TState> {
  override fun startPayment(
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  ) {
    val sessionCallback = this
    viewModelScope.launch(Dispatchers.IO) {
      val componentData = ComponentData(paymentMethod, sessionCallback, null)
      emitData(componentData)
    }
  }

  override fun onFinished(result: SessionPaymentResult) {
    AdyenPaymentPackage.messageBus.onFinished(result)
  }

  override fun onError(componentError: ComponentError) {
    val exception =
      if (componentError.exception is CancellationException) {
        ModuleException.Canceled()
      } else {
        componentError.exception
      }
    AdyenPaymentPackage.messageBus.onSessionException(exception)
  }

  override fun cancel() {
    AdyenPaymentPackage.messageBus.onSessionException(ModuleException.Canceled())
  }

  companion object {
    private const val TAG = "SessionsViewModel"
  }
}
