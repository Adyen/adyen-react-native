package com.adyenreactnativesdk.cse

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.action.core.GenericActionComponent
import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

class ActionFragment(
    private val configuration: CheckoutConfiguration,
    private val callback: ActionComponentCallback,
    private val action: Action,
) :
    BottomSheetDialogFragment() {

    private var actionHandled: Boolean = false
    var component: GenericActionComponent? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        dialog?.setCanceledOnTouchOutside(false)
        return inflater.inflate(R.layout.fragment_instant, container)
    }

    override fun onStart() {
        super.onStart()

        setupComponent()
    }

    private fun setupComponent() {
        val component = GenericActionComponent.PROVIDER.get(
            this,
            configuration,
            callback,
            TAG
        )

        this.component = component
        AdyenCheckout.setComponent(component)
        view?.findViewById<AdyenComponentView>(R.id.component_view)
            ?.attach(component, this)
            ?: { Log.e(TAG, FRAGMENT_ERROR) }

        if (!actionHandled) {
            handle(parentFragmentManager, action, TAG)
        }
    }

    private fun handle(fragmentManager: FragmentManager, action: Action, tag: String) {
        val fragment = fragmentManager.findFragmentByTag(tag) as ActionFragment
        fragment.component?.handleAction(action, requireActivity())
        actionHandled = true
    }

    companion object {
        private const val PAYMENT_METHOD_TYPE_EXTRA = "PAYMENT_METHOD_TYPE_EXTRA"
        internal const val TAG = "InstantFragment"
        const val FRAGMENT_ERROR =
            "Not able to find AdyenComponentView in `component_view` fragment"

        fun show(
            fragmentManager: FragmentManager,
            configuration: CheckoutConfiguration,
            callback: ActionComponentCallback,
            action: Action
        ) {
            ActionFragment(configuration, callback, action).show(fragmentManager, TAG)
        }

        fun hide(fragmentManager: FragmentManager) {
            val fragment = fragmentManager.findFragmentByTag(TAG) as? BottomSheetDialogFragment
            fragment?.dismiss()
        }
    }
}