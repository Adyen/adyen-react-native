package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.paymentmethod.PaymentMethodDetails

data class GenericPaymentComponentState<T : PaymentMethodDetails?>(
    /**
     * @return The data that was collected by the component.
     */
    val data: PaymentComponentData<T>,
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