/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 3/1/2023.
 */

package com.adyenreactnativesdk.component.instant

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

internal class InstantViewModel(private val callback: ComponentCallback<InstantComponentState>) : ViewModel(), ComponentCallback<InstantComponentState> {

    private val _instantComponentDataFlow = MutableStateFlow<InstantComponentData?>(null)
    val instantComponentDataFlow: Flow<InstantComponentData> = _instantComponentDataFlow.filterNotNull()

    private val _instantViewState = MutableStateFlow<InstantViewState>(InstantViewState.Loading)
    val instantViewState: Flow<InstantViewState> = _instantViewState

    private val _events = MutableSharedFlow<InstantEvent>()
    val events: Flow<InstantEvent> = _events

    override fun onSubmit(state: InstantComponentState) {
        _instantViewState.tryEmit(InstantViewState.Loading)
        callback.onSubmit(state)
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        callback.onAdditionalDetails(actionComponentData)
    }

    override fun onError(componentError: ComponentError) {
        onComponentError(componentError)
        callback.onError(componentError)
    }

    fun handle(action: Action) {
        viewModelScope.launch(Dispatchers.IO) {
            _instantViewState.tryEmit(InstantViewState.ShowComponent)
            _events.emit(InstantEvent.AdditionalAction(action))
        }
    }

    private fun onComponentError(error: ComponentError) {
        viewModelScope.launch { _events.emit(InstantEvent.PaymentResult("Failed: ${error.errorMessage}")) }
    }
}

/*

    private suspend fun handlePaymentResponse(json: JSONObject?) {
        json?.let {
            when {
                json.has("action") -> {
                    val action = Action.SERIALIZER.deserialize(json.getJSONObject("action"))
                    _instantViewState.tryEmit(InstantViewState.ShowComponent)
                    _events.emit(InstantEvent.AdditionalAction(action))
                }
                else -> _events.emit(InstantEvent.PaymentResult("Finished: ${json.optString("resultCode")}"))
            }
        } ?: _events.emit(InstantEvent.PaymentResult("Failed"))
    }

 */
