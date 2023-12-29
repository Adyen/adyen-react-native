/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.googlepay

import android.util.Log
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.GenericFragment
import com.adyenreactnativesdk.component.base.ModuleException

class GooglePayFragment(
    private val configuration: GooglePayConfiguration,
    paymentMethod: PaymentMethod,
    session: CheckoutSession?
) :
    GenericFragment<GooglePayComponent, GooglePayComponentState>(paymentMethod, session) {

    override fun setupComponent(componentData: ComponentData<GooglePayComponentState>) {
        val session = session
        val component = (if (session == null) componentData.callback?.let {
            GooglePayComponent.PROVIDER.get(
                this,
                componentData.paymentMethod,
                configuration,
                it,
            )
        } else componentData.sessionCallback?.let {
            GooglePayComponent.PROVIDER.get(
                this,
                session,
                componentData.paymentMethod,
                configuration,
                it
            )
        }) ?: throw ModuleException.Unknown("ViewModel callback is inconsistent")

        this.component = component
        AdyenCheckout.setIntentHandler(component)
        AdyenCheckout.setActivityResultHandlingComponent(component)
        view?.findViewById<AdyenComponentView>(R.id.component_view)
            ?.attach(component, this)
            ?: { Log.e(TAG, FRAGMENT_ERROR) }

        if (!componentCreated) {
            componentCreated = true
            viewModel.componentStarted()
        }
    }

    companion object {

        internal const val TAG = "GooglePayFragment"

        private var componentCreated = false

        fun show(
            fragmentManager: FragmentManager,
            configuration: GooglePayConfiguration,
            paymentMethod: PaymentMethod,
            session: CheckoutSession?
        ) {
            componentCreated = false
            GooglePayFragment(configuration, paymentMethod, session).show(fragmentManager, TAG)
        }

        fun handle(fragmentManager: FragmentManager, action: Action) {
            handle(fragmentManager, action, TAG)
        }

        fun hide(fragmentManager: FragmentManager) {
            hide(fragmentManager, TAG)
        }

    }

    override fun runComponent() {
        component?.startGooglePayScreen(requireActivity(), GooglePayModule.GOOGLEPAY_REQUEST_CODE)
    }
}
