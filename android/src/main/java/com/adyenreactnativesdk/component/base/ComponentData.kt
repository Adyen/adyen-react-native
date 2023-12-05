/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by josephj on 30/1/2023.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod

data class ComponentData<TState: PaymentComponentState<*>>(
    val paymentMethod: PaymentMethod,
    val callback: ComponentCallback<TState>,
)
