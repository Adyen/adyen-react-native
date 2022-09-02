package com.adyenreactnativesdk

import com.adyen.checkout.components.model.payments.request.PaymentComponentData
import com.adyen.checkout.components.model.payments.request.PaymentMethodDetails

class GenericPaymentComponentState<PaymentMethodDetailsT : PaymentMethodDetails?>(
    /**
     * @return The data that was collected by the component.
     */
    val data: PaymentComponentData<PaymentMethodDetailsT>,
    /**
     * @return If the component UI data is valid.
     */
    private var isInputValid: Boolean, isReady: Boolean
) {

    /**
     * @return If the component initialisation is done and data can be sent to the backend when valid.
     */
    val isReady: Boolean

    /**
     * @return If the collected data is valid to be sent to the backend.
     */
    val isValid: Boolean
        get() = isInputValid && isReady

    init {
        isInputValid = isInputValid
        this.isReady = isReady
    }
}