/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 3/1/2023.
 */

package com.adyenreactnativesdk.component.model

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyenreactnativesdk.component.dropin.CheckoutProxy
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

    private val _viewState = MutableStateFlow<ComponentViewState>(ComponentViewState.Loading)
    val viewState: Flow<ComponentViewState> = _viewState

    private val _events = MutableSharedFlow<ComponentEvent>()
    internal val events: Flow<ComponentEvent> = _events

    fun startPayment(componentData: TComponentData?) {
        viewModelScope.launch {
            _componentDataFlow.emit(componentData)
        }
    }

    override fun onSubmit(state: TState) {
        _viewState.tryEmit(ComponentViewState.Loading)
        CheckoutProxy.shared.componentListener?.let { it.onSubmit(state) } ?: {
            Log.e(TAG, "CheckoutProxy.shared.componentListener is null")
        }
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        CheckoutProxy.shared.componentListener?.let { it.onAdditionalData(jsonObject) } ?: {
            Log.e(TAG, "CheckoutProxy.shared.componentListener is null")
        }
    }

    override fun onError(componentError: ComponentError) {
        viewModelScope.launch { _events.emit(ComponentEvent.PaymentResult("Failed: ${componentError.errorMessage}")) }
        CheckoutProxy.shared.componentListener?.let { it.onException(componentError.exception) } ?: {
            Log.e(TAG, "CheckoutProxy.shared.componentListener is null")
        }
    }

    fun handle(action: Action) {
        viewModelScope.launch(Dispatchers.IO) {
            _viewState.tryEmit(ComponentViewState.ShowComponent)
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

    companion object {
        private const val TAG = "GenericViewModel"
    }
}
