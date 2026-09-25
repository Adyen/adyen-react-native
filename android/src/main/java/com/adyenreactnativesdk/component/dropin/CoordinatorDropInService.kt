/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.dropin.DropInService
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator

/** Routes official Drop-in service callbacks to the active coordinator-owned Drop-in operation. */
internal class CoordinatorDropInService : DropInService() {
  override suspend fun onSubmit(data: PaymentComponentData<*>): SubmitResult = CheckoutCoordinator.shared.onDropInSubmit(data)

  override suspend fun onAdditionalDetails(data: ActionComponentData): AdditionalDetailsResult =
    CheckoutCoordinator.shared.onDropInAdditionalDetails(data)
}
