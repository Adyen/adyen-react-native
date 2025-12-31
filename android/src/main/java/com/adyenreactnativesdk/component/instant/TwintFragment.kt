/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 */

package com.adyenreactnativesdk.component.instant

import android.util.Log
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.twint.TwintComponent
import com.adyen.checkout.twint.TwintComponentState
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.BaseComponentFragment
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ModuleException

class TwintFragment(
  private val configuration: CheckoutConfiguration,
  paymentMethod: PaymentMethod,
  session: CheckoutSession?,
) : BaseComponentFragment<TwintComponent, TwintComponentState>(paymentMethod, session) {
  override fun setupComponent(componentData: ComponentData<TwintComponentState>) {
    val session = session
    val component =
      (
        if (session == null) {
          componentData.callback?.let {
            TwintComponent.PROVIDER.get(
              this,
              componentData.paymentMethod,
              configuration,
              it,
            )
          }
        } else {
          componentData.sessionCallback?.let {
            TwintComponent.PROVIDER.get(
              this,
              session,
              componentData.paymentMethod,
              configuration,
              it,
            )
          }
        }
      ) ?: throw ModuleException.WrongFlow()

    this.component = component
    AdyenCheckout.setComponent(component)
    view
      ?.findViewById<AdyenComponentView>(R.id.component_view)
      ?.attach(component, this)
      ?: { Log.e(TAG, FRAGMENT_ERROR) }
  }

  companion object : IInstantFragment {
    internal const val TAG = "TwintFragment"

    override fun show(
      fragmentManager: FragmentManager,
      configuration: CheckoutConfiguration,
      paymentMethod: PaymentMethod,
      session: CheckoutSession?,
    ) {
      TwintFragment(configuration, paymentMethod, session).show(fragmentManager, TAG)
    }

    override fun handle(
      fragmentManager: FragmentManager,
      action: Action,
    ) {
      handle(fragmentManager, action, TAG)
    }

    override fun hide(fragmentManager: FragmentManager) {
      hide(fragmentManager, TAG)
    }
  }

  override fun runComponent() { // No action needed
  }
}
