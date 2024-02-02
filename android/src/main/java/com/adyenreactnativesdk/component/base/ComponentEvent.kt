/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.components.core.action.Action

sealed class ComponentEvent {
    object ComponentCreated : ComponentEvent()
    data class AdditionalAction(val action: Action) : ComponentEvent()
}
