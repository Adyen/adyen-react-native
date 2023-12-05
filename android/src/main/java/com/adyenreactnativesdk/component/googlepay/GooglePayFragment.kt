/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 3/1/2023.
 */

package com.adyenreactnativesdk.component.googlepay

import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.googlepay.GooglePayComponent
import com.adyen.checkout.googlepay.GooglePayComponentState
import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.model.ComponentData
import com.adyenreactnativesdk.component.model.GenericFragment

class GooglePayFragment(private val configuration: GooglePayConfiguration, private val paymentMethod: PaymentMethod) :
    GenericFragment<GooglePayComponent, GooglePayComponentState>(paymentMethod) {

    override fun setupComponent(componentData: ComponentData<GooglePayComponentState>) {
        val component = GooglePayComponent.PROVIDER.get(
            this,
            paymentMethod,
            configuration,
            viewModel
        )
        this.component = component
        AdyenCheckout.setIntentHandler(component)
        AdyenCheckout.setActivityResultHandlingComponent(component)
        view?.findViewById<AdyenComponentView>(R.id.component_view)?.attach(component, this)
        viewModel.componentStarted()
    }

    companion object {

        internal const val TAG = "GooglePayFragment"

        fun show(fragmentManager: FragmentManager, configuration: GooglePayConfiguration, paymentMethod: PaymentMethod) {
            GooglePayFragment(configuration, paymentMethod).show(fragmentManager, TAG)
        }

        fun handle(fragmentManager: FragmentManager, action: Action) {
            handle(fragmentManager, action, TAG)
        }

        fun hide(fragmentManager: FragmentManager) {
            hide(fragmentManager, TAG)
        }

    }

    override fun runComponent() {
        component?.startGooglePayScreen(requireActivity(), AdyenGooglePayComponent.GOOGLEPAY_REQUEST_CODE)
    }
}
