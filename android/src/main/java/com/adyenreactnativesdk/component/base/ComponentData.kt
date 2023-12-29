/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback

data class ComponentData<TState: PaymentComponentState<*>>(
    val checkoutSession: CheckoutSession?,
    val paymentMethod: PaymentMethod,
    val sessioncallback: SessionComponentCallback<TState>?,
    val callback: ComponentCallback<TState>?,
)

