/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.component.CheckoutProxy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

internal interface ViewModelInterface<TState : PaymentComponentState<*>> {
    fun startPayment(paymentMethod: PaymentMethod, session: CheckoutSession?)
    fun handle(action: Action)
    fun componentStarted()

    val events: Flow<ComponentEvent>
    val componentDataFlow: Flow<ComponentData<TState>>
}

abstract class BaseViewModel<TState : PaymentComponentState<*>, TComponentData : ComponentData<TState>> :
    ViewModel(), ViewModelInterface<TState> {

    private val _componentDataFlow = MutableStateFlow<TComponentData?>(null)
    override val componentDataFlow: Flow<TComponentData> =
        _componentDataFlow.filterNotNull()

    private val _events = MutableSharedFlow<ComponentEvent>()
    override val events: Flow<ComponentEvent> = _events

    override fun handle(action: Action) {
        viewModelScope.launch(Dispatchers.IO) {
            _events.emit(ComponentEvent.AdditionalAction(action))
        }
    }

    override fun componentStarted() {
        viewModelScope.launch(Dispatchers.IO) {
            _events.emit(ComponentEvent.ComponentCreated)
        }
    }

    fun onError(componentError: ComponentError) {
        CheckoutProxy.shared.componentListener?.let { it.onException(componentError.exception) }
            ?: {
                Log.e(
                    TAG,
                    COMPONENT_LISTENER_IS_NULL
                )
            }
    }

    protected suspend fun emitData(componentData: ComponentData<TState>) {
        _componentDataFlow.emit(componentData as TComponentData)
    }

    companion object {
        const val COMPONENT_LISTENER_IS_NULL =
            "CheckoutProxy.shared.componentListener is null"
        private const val TAG = "ComponentViewModel"
    }
}

