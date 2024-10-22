package com.adyenreactnativesdk.component.base

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.component.CheckoutProxy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AdvancedComponentViewModel<TState : PaymentComponentState<*>, TComponentData : ComponentData<TState>> :
    BaseViewModel<TState, TComponentData>(), ComponentCallback<TState> {

    override fun startPayment(paymentMethod: PaymentMethod, session: CheckoutSession?) {
        val callback = this
        viewModelScope.launch(Dispatchers.IO) {
            val componentData = ComponentData(paymentMethod, null, callback)
            emitData(componentData)
        }
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        CheckoutProxy.shared.componentListener?.onAdditionalDetails(actionComponentData) ?: {
            Log.e(
                TAG,
                COMPONENT_LISTENER_IS_NULL
            )
        }
    }

    override fun onSubmit(state: TState) {
        CheckoutProxy.shared.componentListener?.onSubmit(state) ?: {
            Log.e(
                TAG,
                COMPONENT_LISTENER_IS_NULL
            )
        }
    }


    companion object {
        private const val TAG = "AdvancedViewModel"
    }
}