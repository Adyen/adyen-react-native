/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.googlepay

import android.os.Bundle
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.instant.BaseInstantComponentFragment
import com.adyenreactnativesdk.component.base.instant.IInstantFragment
import com.adyenreactnativesdk.component.base.instant.instantFragmentDelegate

class GooglePayFragment : BaseInstantComponentFragment<GooglePayComponent, GooglePayComponentState>() {
  private var googlePayScreenVisible = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    googlePayScreenVisible = savedInstanceState?.getBoolean(KEY_GOOGLE_PAY_SCREEN_VISIBLE) ?: false
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putBoolean(KEY_GOOGLE_PAY_SCREEN_VISIBLE, googlePayScreenVisible)
  }

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

  companion object : IInstantFragment by instantFragmentDelegate(::GooglePayFragment) {
    private const val KEY_GOOGLE_PAY_SCREEN_VISIBLE = "KEY_GOOGLE_PAY_SCREEN_VISIBLE"
  }
}
