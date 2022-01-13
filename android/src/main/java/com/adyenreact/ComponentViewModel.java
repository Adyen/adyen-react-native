package com.adyenreact;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.components.model.paymentmethods.PaymentMethod;
import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.components.model.payments.request.PaymentComponentData;

import java.util.Locale;

interface PaymentComponentListener {
    void onError(Exception exception);
    void onSubmit(PaymentComponentData data);
}

class ComponentViewModel {
    private final PaymentMethod paymentMethod;
    private final Amount amount;
    private final Locale shopperLocale;
    private PaymentComponentListener listener;

    ComponentViewModel(@NonNull PaymentMethod paymentMethod, @NonNull Locale shopperLocale, @Nullable Amount amount ) {
        this.paymentMethod = paymentMethod;
        this.amount = amount;
        this.shopperLocale = shopperLocale;
    }

    @Nullable
    public Amount getAmount() {
        return amount;
    }

    @NonNull
    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    @NonNull
    public Locale getShopperLocale() {
        return shopperLocale;
    }

    public PaymentComponentListener getListener() {
        return listener;
    }

    public void setListener(PaymentComponentListener listener) {
        this.listener = listener;
    }
}
