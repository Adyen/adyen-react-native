package com.adyenreactnativesdk.component.base.instant

import android.util.Log
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionComponentCallback
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyen.checkout.ui.core.internal.ui.ViewableComponent
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ModuleException

abstract class BaseInstantComponentFragment<TComponent, TState : PaymentComponentState<*>> :
  BaseComponentFragment<TComponent, TState>() where TComponent : Component,
        TComponent : ActionHandlingComponent,
        TComponent : ViewableComponent {
  protected open val logTag: String
    get() = javaClass.simpleName

  protected abstract fun createComponent(
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: ComponentCallback<TState>,
  ): TComponent

  protected abstract fun createComponent(
    session: CheckoutSession,
    paymentMethod: PaymentMethod,
    configuration: CheckoutConfiguration,
    callback: SessionComponentCallback<TState>,
  ): TComponent

  override fun setupComponent(componentData: ComponentData<TState>) {
    val session = session
    val component =
      (
        if (session == null) {
          componentData.callback?.let {
            createComponent(
              componentData.paymentMethod,
              configuration,
              it,
            )
          }
        } else {
          componentData.sessionCallback?.let {
            createComponent(
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
      ?: run { Log.e(logTag, FRAGMENT_ERROR) }
  }
}
