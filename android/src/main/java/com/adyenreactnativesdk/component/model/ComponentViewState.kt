/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 4/1/2023.
 */

package com.adyenreactnativesdk.component.model

sealed class ComponentViewState {
    object Loading : ComponentViewState()
    class Error(val errorMessage: String) : ComponentViewState()
    object ShowComponent : ComponentViewState()
}
