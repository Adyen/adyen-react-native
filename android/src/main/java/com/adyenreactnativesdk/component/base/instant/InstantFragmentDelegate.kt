package com.adyenreactnativesdk.component.base.instant

import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession

/**
 * Builds an [IInstantFragment] whose tag is derived from [T], so fragments don't need to declare
 * their class name as a string twice (once for the tag, once for logging).
 */
internal inline fun <reified T : BaseComponentFragment<*, *>> instantFragmentDelegate(noinline factory: () -> T): IInstantFragment =
  InstantFragmentDelegate(T::class.java.simpleName, factory)

internal class InstantFragmentDelegate(
  private val tag: String,
  private val fragmentFactory: () -> BaseComponentFragment<*, *>,
) : IInstantFragment {
  override fun show(
    fragmentManager: FragmentManager,
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?,
  ) {
    fragmentFactory()
      .apply { arguments = BaseComponentFragment.buildArguments(configuration, paymentMethod, session) }
      .show(fragmentManager, tag)
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
