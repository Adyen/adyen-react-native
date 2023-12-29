/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.PaymentComponent
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.launch

abstract class GenericFragment<TComponent, TState : PaymentComponentState<*>>(private val paymentMethod: PaymentMethod,
                                                                              protected var session: CheckoutSession? = null
) :
    BottomSheetDialogFragment() where TComponent : PaymentComponent,
                                      TComponent : ActionHandlingComponent {

    var component: TComponent? = null

    private val advancedViewModel: AdvancedComponentViewModel<TState, ComponentData<TState>> by viewModels()
    private val sessionViewModel: SessionsComponentViewModel<TState, ComponentData<TState>> by viewModels()

    internal val viewModel: ViewModelInterface<TState>
        get() {
            return if (session == null) advancedViewModel else sessionViewModel
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_instant, container)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewLifecycleOwner.lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { viewModel.componentDataFlow.collect(::setupComponent) }
                launch { viewModel.events.collect(::onEvent) }
            }
        }

        viewModel.startPayment(paymentMethod, session)
    }

    abstract fun setupComponent(componentData: ComponentData<TState>)

    abstract fun runComponent()

    private fun onEvent(event: ComponentEvent) {
        when (event) {
            is ComponentEvent.AdditionalAction -> {
                component?.handleAction(event.action, requireActivity())
            }

            is ComponentEvent.ComponentCreated -> {
                runComponent()
            }

            is ComponentEvent.PaymentResult -> {
                Log.d("GenericFragment", "PaymentResult")
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        component = null
    }

    companion object {
        fun handle(fragmentManager: FragmentManager, action: Action, tag: String) {
            val fragment = fragmentManager.findFragmentByTag(tag) as GenericFragment<*, *>
            fragment.viewModel.handle(action)
        }

        fun hide(fragmentManager: FragmentManager, tag: String) {
            val fragment = fragmentManager.findFragmentByTag(tag) as BottomSheetDialogFragment
            fragment.dismiss()
        }
    }
}
