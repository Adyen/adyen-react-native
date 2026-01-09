/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.googlepay

import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.instant.BaseInstantComponentFragment
import com.adyenreactnativesdk.component.base.instant.IInstantFragment
import com.adyenreactnativesdk.component.base.instant.InstantFragmentDelegate

class GooglePayFragment(
  configuration: CheckoutConfiguration,
  paymentMethod: PaymentMethod,
  session: CheckoutSession?,
) : BaseInstantComponentFragment<GooglePayComponent, GooglePayComponentState>(configuration, paymentMethod, session) {
  override val logTag: String = TAG

  private var googlePayScreenVisible = false

  override fun createComponent(
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: ComponentCallback<GooglePayComponentState>,
  ): GooglePayComponent =
    GooglePayComponent.PROVIDER.get(
      this,
      paymentMethod,
      configuration,
      callback,
    )

  override fun createComponent(
    session: CheckoutSession,
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: SessionComponentCallback<GooglePayComponentState>,
  ): GooglePayComponent =
    GooglePayComponent.PROVIDER.get(
      this,
      session,
      paymentMethod,
      configuration,
      callback,
    )

  override fun setupComponent(componentData: ComponentData<GooglePayComponentState>) {
    super.setupComponent(componentData)
    viewModel.componentStarted()
  }

  override fun runComponent() {
    if (!googlePayScreenVisible) {
      component?.submit()
      googlePayScreenVisible = true
    }
  }

  companion object : IInstantFragment {
    internal const val TAG = "GooglePayFragment"

    private val instantDelegate =
      InstantFragmentDelegate(
        "GooglePayFragment",
        ::GooglePayFragment,
      )

    override fun show(
      fragmentManager: FragmentManager,
      configuration: CheckoutConfiguration,
      paymentMethod: PaymentMethod,
      session: CheckoutSession?,
    ) {
      instantDelegate.show(fragmentManager, configuration, paymentMethod, session)
    }

    override fun handle(
      fragmentManager: FragmentManager,
      action: Action,
    ) {
      instantDelegate.handle(fragmentManager, action)
    }

    override fun hide(fragmentManager: FragmentManager) {
      instantDelegate.hide(fragmentManager)
    }
  }
}
