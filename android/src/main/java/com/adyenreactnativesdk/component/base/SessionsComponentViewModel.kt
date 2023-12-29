package com.adyenreactnativesdk.component.base

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.adyenreactnativesdk.component.CheckoutProxy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SessionsComponentViewModel<TState : PaymentComponentState<*>, TComponentData : ComponentData<TState>> :
    BaseViewModel<TState, TComponentData>(),
    SessionComponentCallback<TState> {

    override fun startPayment(paymentMethod: PaymentMethod, session: CheckoutSession?) {
        val callback = this
        viewModelScope.launch(Dispatchers.IO) {
            val componentData = ComponentData(null, paymentMethod, callback, null)
            emitData(componentData)
        }
    }

    override fun onAction(action: Action) {
        handle(action)
    }

    override fun onFinished(result: SessionPaymentResult) {
        CheckoutProxy.shared.componentListener?.let { it.onFinished(result) } ?: {
            Log.e(TAG, COMPONENT_LISTENER_IS_NULL)
        }
    }

    companion object {
        private const val TAG = "SessionsViewModel"
    }
}