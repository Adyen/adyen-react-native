/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.ui;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.components.model.paymentmethods.PaymentMethod;
import com.adyen.checkout.components.model.payments.Amount;

import java.util.Locale;

public class ComponentViewModel {
    private final PaymentMethod paymentMethod;
    private final Amount amount;
    private final Locale shopperLocale;
    private PaymentComponentListener listener;

    public ComponentViewModel(@NonNull PaymentMethod paymentMethod, @NonNull Locale shopperLocale, @Nullable Amount amount) {
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
