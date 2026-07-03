package com.adyenreactnativesdk.component.base.viewmodel

import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ModuleException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AdvancedComponentViewModel<TState : PaymentComponentState<*>> :
  BaseViewModel<TState>(),
  ComponentCallback<TState> {
  override fun startPayment(
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  ) {
    val callback = this
    viewModelScope.launch(Dispatchers.IO) {
      val componentData = ComponentData(paymentMethod, null, callback)
      emitData(componentData)
    }
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    AdyenPaymentPackage.messageBus.onAdditionalDetails(actionComponentData)
  }

  override fun onSubmit(state: TState) {
    AdyenPaymentPackage.messageBus.onSubmit(state, null)
  }

  override fun onError(componentError: ComponentError) {
    val exception =
      if (componentError.exception is CancellationException) {
        ModuleException.Canceled()
      } else {
        componentError.exception
      }
    AdyenPaymentPackage.messageBus.onException(exception)
  }

  override fun cancel() {
    AdyenPaymentPackage.messageBus.onException(ModuleException.Canceled())
  }

  companion object {
    private const val TAG = "AdvancedViewModel"
  }
}
