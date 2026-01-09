package com.adyenreactnativesdk.component.base.instant

import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession

internal class InstantFragmentDelegate(
  private val tag: String,
  private val fragmentFactory: (
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  ) -> BaseComponentFragment<*, *>,
) : IInstantFragment {
  override fun show(
    fragmentManager: FragmentManager,
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  ) {
    fragmentFactory(configuration, paymentMethod, session).show(fragmentManager, tag)
  }

  override fun handle(
    fragmentManager: FragmentManager,
    action: Action,
  ) {
    BaseComponentFragment.handle(fragmentManager, action, tag)
  }

  override fun hide(fragmentManager: FragmentManager) {
    BaseComponentFragment.hide(fragmentManager, tag)
  }
}
