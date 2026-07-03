/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 */

package com.adyenreactnativesdk.component.instant.fragment

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.paybybank.PayByBankComponent
import com.adyen.checkout.paybybank.PayByBankComponentState
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyenreactnativesdk.component.base.instant.BaseInstantComponentFragment
import com.adyenreactnativesdk.component.base.instant.IInstantFragment
import com.adyenreactnativesdk.component.base.instant.InstantFragmentDelegate

class PayByBankGlobalFragment(
  configuration: CheckoutConfiguration,
  paymentMethod: PaymentMethod,
  session: CheckoutSession?,
) : BaseInstantComponentFragment<PayByBankComponent, PayByBankComponentState>(configuration, paymentMethod, session) {
  override val logTag: String = TAG

  override fun createComponent(
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: ComponentCallback<PayByBankComponentState>,
  ): PayByBankComponent =
    PayByBankComponent.PROVIDER.get(
      this,
      paymentMethod,
      configuration,
      callback,
    )

  override fun createComponent(
    session: CheckoutSession,
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: SessionComponentCallback<PayByBankComponentState>,
  ): PayByBankComponent =
    PayByBankComponent.PROVIDER.get(
      this,
      session,
      paymentMethod,
      configuration,
      callback,
    )

  companion object : IInstantFragment by InstantFragmentDelegate(
    "PayByBankGlobalFragment",
    ::PayByBankGlobalFragment,
  ) {
    internal const val TAG = "PayByBankGlobalFragment"
  }
}
