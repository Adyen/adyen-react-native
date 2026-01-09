/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 */

package com.adyenreactnativesdk.component.instant.fragment

import androidx.core.os.bundleOf
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import com.adyen.checkout.instant.InstantPaymentComponent
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyenreactnativesdk.component.base.instant.BaseInstantComponentFragment
import com.adyenreactnativesdk.component.base.instant.IInstantFragment
import com.adyenreactnativesdk.component.base.instant.InstantFragmentDelegate

class InstantFragment(
  configuration: CheckoutConfiguration,
  paymentMethod: PaymentMethod,
  session: CheckoutSession?,
) : BaseInstantComponentFragment<InstantPaymentComponent, InstantComponentState>(configuration, paymentMethod, session) {
  override val logTag: String = TAG

  override fun createComponent(
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: ComponentCallback<InstantComponentState>,
  ): InstantPaymentComponent =
    InstantPaymentComponent.PROVIDER.get(
      this,
      paymentMethod,
      configuration,
      callback,
    )

  override fun createComponent(
    session: CheckoutSession,
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: SessionComponentCallback<InstantComponentState>,
  ): InstantPaymentComponent =
    InstantPaymentComponent.PROVIDER.get(
      this,
      session,
      paymentMethod,
      configuration,
      callback,
    )

  companion object : IInstantFragment by InstantFragmentDelegate(
    "InstantFragment",
    ::InstantFragment,
  ) {
    private const val PAYMENT_METHOD_TYPE_EXTRA = "PAYMENT_METHOD_TYPE_EXTRA"
    internal const val TAG = "InstantFragment"

    override fun show(
      fragmentManager: FragmentManager,
      configuration: CheckoutConfiguration,
      paymentMethod: PaymentMethod,
      session: CheckoutSession?,
    ) {
      InstantFragment(configuration, paymentMethod, session)
        .apply {
          arguments =
            bundleOf(
              PAYMENT_METHOD_TYPE_EXTRA to paymentMethod.type,
            )
        }.show(fragmentManager, TAG)
    }
  }
}
