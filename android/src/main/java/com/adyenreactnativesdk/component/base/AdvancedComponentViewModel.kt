package com.adyenreactnativesdk.component.base

import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.AdyenPaymentPackage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AdvancedComponentViewModel<TState : PaymentComponentState<*>, TComponentData : ComponentData<TState>> :
  BaseViewModel<TState, TComponentData>(),
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
    AdyenPaymentPackage.messageBus?.onAdditionalDetails(actionComponentData)
  }

  override fun onSubmit(state: TState) {
    AdyenPaymentPackage.messageBus?.onSubmit(state, null)
  }
}
