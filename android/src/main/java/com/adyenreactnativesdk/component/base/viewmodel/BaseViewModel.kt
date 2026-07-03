/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ComponentEvent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

internal interface ViewModelInterface<TState : PaymentComponentState<*>> {
  fun startPayment(
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  )

  fun onAction(action: Action)

  fun componentStarted()

  fun cancel()

  val events: Flow<ComponentEvent>
  val componentDataFlow: Flow<ComponentData<TState>>
}

abstract class BaseViewModel<TState : PaymentComponentState<*>> :
  ViewModel(),
  ViewModelInterface<TState> {
  private val _componentDataFlow = MutableStateFlow<ComponentData<TState>?>(null)
  override val componentDataFlow: Flow<ComponentData<TState>> =
    _componentDataFlow.filterNotNull()

  private val _events = MutableSharedFlow<ComponentEvent>()
  override val events: Flow<ComponentEvent> = _events

  override fun onAction(action: Action) {
    viewModelScope.launch(Dispatchers.IO) {
      _events.emit(ComponentEvent.AdditionalAction(action))
    }
  }

  override fun componentStarted() {
    viewModelScope.launch(Dispatchers.Main) {
      _events.emit(ComponentEvent.ComponentCreated)
    }
  }

  abstract override fun cancel()

  protected suspend fun emitData(componentData: ComponentData<TState>) {
    _componentDataFlow.emit(componentData)
  }

  companion object {
    const val COMPONENT_LISTENER_IS_NULL =
      "CheckoutProxy.shared.componentListener is null"
    private const val TAG = "ComponentViewModel"
  }
}
