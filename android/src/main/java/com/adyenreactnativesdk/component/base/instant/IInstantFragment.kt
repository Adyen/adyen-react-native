package com.adyenreactnativesdk.component.base.instant

import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession

interface IInstantFragment {
  fun show(
    fragmentManager: FragmentManager,
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  )

  fun handle(
    fragmentManager: FragmentManager,
    action: Action,
  )

  fun hide(fragmentManager: FragmentManager)
}
