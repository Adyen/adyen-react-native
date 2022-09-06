package com.adyenreactnativesdk

import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.components.model.payments.request.PaymentMethodDetails

data class GenericPaymentComponentState<PaymentMethodDetailsT : PaymentMethodDetails?>(
    /**
     * @return The data that was collected by the component.
     */
    val data: PaymentComponentData<PaymentMethodDetailsT>,
    /**
     * @return If the component UI data is valid.
     */
    private val isInputValid: Boolean,
    private val isReady: Boolean
) {

    /**
     * @return If the collected data is valid to be sent to the backend.
     */
    val isValid: Boolean
        get() = isInputValid && isReady

}