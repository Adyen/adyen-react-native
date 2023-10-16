package com.adyenreactnativesdk.ui

import com.adyen.checkout.components.model.payments.request.PaymentComponentData

interface PaymentComponentListener {
    fun onError(exception: Exception)
    fun onSubmit(data: PaymentComponentData<*>)
}