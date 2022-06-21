package com.adyenreactnativesdk;

import com.adyen.checkout.components.model.payments.request.PaymentComponentData;

public interface PaymentComponentListener {
    void onError(Exception exception);

    void onSubmit(PaymentComponentData data);
}
