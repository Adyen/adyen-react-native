/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.CheckoutProxy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

class GenericViewModel<TState : PaymentComponentState<*>, TComponentData: ComponentData<TState>>() : ViewModel(), ComponentCallback<TState> {

    private val _componentDataFlow = MutableStateFlow<TComponentData?>(null)
    val componentDataFlow: Flow<TComponentData> =
        _componentDataFlow.filterNotNull()

    private val _events = MutableSharedFlow<ComponentEvent>()
    internal val events: Flow<ComponentEvent> = _events

    private var componentStarted: Boolean = false

    override fun onSubmit(state: TState) {
        CheckoutProxy.shared.componentListener?.let { it.onSubmit(state) } ?: {
            Log.e(TAG, COMPONENT_LISTENER_IS_NULL)
        }
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        CheckoutProxy.shared.componentListener?.let { it.onAdditionalData(jsonObject) } ?: {
            Log.e(TAG, COMPONENT_LISTENER_IS_NULL)
        }
    }

    override fun onError(componentError: ComponentError) {
        CheckoutProxy.shared.componentListener?.let { it.onException(componentError.exception) } ?: {
            Log.e(TAG, COMPONENT_LISTENER_IS_NULL)
        }
    }

    fun handle(action: Action) {
        viewModelScope.launch(Dispatchers.IO) {
            _events.emit(ComponentEvent.AdditionalAction(action))
        }
    }

    fun startPayment(paymentMethod: PaymentMethod) {
        val callback = this
        viewModelScope.launch(Dispatchers.IO) {
            val componentData = ComponentData(paymentMethod, callback)
            _componentDataFlow.emit(componentData as TComponentData)
        }
    }

    fun componentStarted() {
        if (!componentStarted) {
            componentStarted = true
            viewModelScope.launch(Dispatchers.IO) {
                _events.emit(ComponentEvent.ComponentCreated)
            }
        }
    }

    companion object {
        private const val COMPONENT_LISTENER_IS_NULL = "CheckoutProxy.shared.componentListener is null"
        private const val TAG = "GenericViewModel"
    }
}