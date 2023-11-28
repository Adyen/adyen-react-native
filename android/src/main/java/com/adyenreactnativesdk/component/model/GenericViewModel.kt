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
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import com.adyenreactnativesdk.component.dropin.CheckoutProxy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

class GenericViewModel<TState : PaymentComponentState<*>, TComponentData: ComponentData<TState>>() : ViewModel(), ComponentCallback<TState> {

    private val _instantComponentDataFlow = MutableStateFlow<TComponentData?>(null)
    val instantComponentDataFlow: Flow<TComponentData> =
        _instantComponentDataFlow.filterNotNull()

    private val _viewState = MutableStateFlow<ComponentViewState>(ComponentViewState.Loading)
    val viewState: Flow<ComponentViewState> = _viewState

    private val _events = MutableSharedFlow<ComponentEvent>()
    internal val events: Flow<ComponentEvent> = _events

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

    companion object {
        private const val TAG = "GenericViewModel"
    }
}
