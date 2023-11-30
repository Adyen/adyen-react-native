/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 3/1/2023.
 */

package com.adyenreactnativesdk.component.instant

import androidx.core.os.bundleOf
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.instant.InstantComponentState
import com.adyen.checkout.instant.InstantPaymentComponent
import com.adyen.checkout.instant.InstantPaymentConfiguration
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.model.ComponentData
import com.adyenreactnativesdk.component.model.GenericFragment

class InstantFragment(
    private val configuration: InstantPaymentConfiguration,
    val paymentMethod: PaymentMethod
) :
    GenericFragment<InstantPaymentComponent, InstantComponentState>(paymentMethod) {

    override fun setupComponent(componentData: ComponentData<InstantComponentState>) {
        val instantPaymentComponent = InstantPaymentComponent.PROVIDER.get(
            this,
            componentData.paymentMethod,
            configuration,
            componentData.callback,
        )

        this.component = instantPaymentComponent
        AdyenCheckout.setIntentHandler(instantPaymentComponent)
        view?.findViewById<AdyenComponentView>(R.id.component_view)?.attach(instantPaymentComponent, viewLifecycleOwner)
    }

    companion object {
        private const val PAYMENT_METHOD_TYPE_EXTRA = "PAYMENT_METHOD_TYPE_EXTRA"
        internal const val TAG = "InstantFragment"

        fun show(fragmentManager: FragmentManager, configuration: InstantPaymentConfiguration, paymentMethod: PaymentMethod) {
            InstantFragment(configuration, paymentMethod).apply {
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
}