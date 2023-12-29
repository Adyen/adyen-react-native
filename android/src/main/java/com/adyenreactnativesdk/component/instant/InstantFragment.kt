/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 */

package com.adyenreactnativesdk.component.instant

import androidx.core.os.bundleOf
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import com.adyen.checkout.instant.InstantPaymentComponent
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.GenericFragment

class InstantFragment(
    private val configuration: InstantPaymentConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?
) :
    GenericFragment<InstantPaymentComponent, InstantComponentState>(paymentMethod, session) {

    override fun setupComponent(componentData: ComponentData<InstantComponentState>) {
        val session = session
        val component = if (session == null) componentData.callback?.let {
            InstantPaymentComponent.PROVIDER.get(
                this,
                componentData.paymentMethod,
                configuration,
                it,
            )
        } else {
            componentData.sessioncallback?.let {
                InstantPaymentComponent.PROVIDER.get(
                    this,
                    session,
                    componentData.paymentMethod,
                    configuration,
                    it
                )
            }
        } ?: return

        this.component = component
        AdyenCheckout.setIntentHandler(component)
        view?.findViewById<AdyenComponentView>(R.id.component_view)?.attach(component, viewLifecycleOwner)
    }

    companion object {
        private const val PAYMENT_METHOD_TYPE_EXTRA = "PAYMENT_METHOD_TYPE_EXTRA"
        internal const val TAG = "InstantFragment"

        fun show(fragmentManager: FragmentManager, configuration: InstantPaymentConfiguration, paymentMethod: PaymentMethod, session: CheckoutSession?) {
            InstantFragment(configuration, paymentMethod, session).apply {
                arguments = bundleOf(
                    PAYMENT_METHOD_TYPE_EXTRA to paymentMethod.type
                )
            }.show(fragmentManager, TAG)
        }

        fun handle(fragmentManager: FragmentManager, action: Action) {
            handle(fragmentManager, action, TAG)
        }

        fun hide(fragmentManager: FragmentManager) {
            hide(fragmentManager, TAG)
        }

    }

    override fun runComponent() { /* No action needed */ }
}
