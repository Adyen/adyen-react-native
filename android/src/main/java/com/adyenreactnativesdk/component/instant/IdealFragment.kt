/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 */

package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.ideal.IdealComponent
import com.adyen.checkout.ideal.IdealComponentState
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback

class IdealFragment(
  configuration: CheckoutConfiguration,
  paymentMethod: PaymentMethod,
  session: CheckoutSession?,
) : BaseInstantComponentFragment<IdealComponent, IdealComponentState>(configuration, paymentMethod, session) {
  override val logTag: String = TAG

  override fun createComponent(
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: ComponentCallback<IdealComponentState>,
  ): IdealComponent =
    IdealComponent.PROVIDER.get(
      this,
      paymentMethod,
      configuration,
      callback,
    )

  override fun createComponent(
    session: CheckoutSession,
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: SessionComponentCallback<IdealComponentState>,
  ): IdealComponent =
    IdealComponent.PROVIDER.get(
      this,
      session,
      paymentMethod,
      configuration,
      callback,
    )

  companion object : IInstantFragment by InstantFragmentDelegate(
    "IdealFragment",
    ::IdealFragment,
  ) {
    internal const val TAG = "IdealFragment"
  }

  override fun runComponent() { // No action needed
  }
}
