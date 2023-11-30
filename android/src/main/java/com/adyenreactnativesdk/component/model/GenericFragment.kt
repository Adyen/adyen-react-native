/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 *
 * Created by ozgur on 3/1/2023.
 */

package com.adyenreactnativesdk.component.model

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentCallback
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.PaymentComponent
import com.adyenreactnativesdk.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.launch

abstract class GenericFragment<TComponent, TState : PaymentComponentState<*>>(private val paymentMethod: PaymentMethod) :
    BottomSheetDialogFragment() where TComponent : PaymentComponent,
                                                              TComponent : ActionHandlingComponent {

    var component: TComponent? = null

    internal val viewModel: GenericViewModel<TState, ComponentData<TState>> by viewModels()

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
                launch { viewModel.viewState.collect(::onViewState) }
            }
        }

        viewModel.startPayment(paymentMethod)
    }

    fun onNewIntent(intent: Intent) {
        component?.handleIntent(intent)
    }

    abstract fun setupComponent(componentData: ComponentData<TState>)

    private fun onEvent(event: ComponentEvent) {
        when (event) {
            is ComponentEvent.AdditionalAction -> {
                onAction(event.action)
            }

            is ComponentEvent.PaymentResult -> {
                onPaymentResult(event.result)
            }
        }
    }

    private fun onPaymentResult(result: String) {
        Toast.makeText(requireContext(), result, Toast.LENGTH_SHORT).show()
        dismiss()
    }

    private fun onViewState(viewState: ComponentViewState) {
//        when (viewState) {
//            is ComponentViewState.Error -> {
//                binding.progressIndicator.isVisible = false
//                binding.componentContainer.isVisible = false
//            }
//
//            is ComponentViewState.Loading -> {
//                binding.progressIndicator.isVisible = true
//                binding.errorView.isVisible = false
//                binding.componentContainer.isVisible = false
//            }
//
//            is ComponentViewState.ShowComponent -> {
//                binding.progressIndicator.isVisible = false
//                binding.errorView.isVisible = false
//                binding.componentContainer.isVisible = true
//            }
//        }
    }

    private fun onAction(action: Action) {
        component?.handleAction(action, requireActivity())
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

    fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        TODO("Not yet implemented")
    }

    fun onError(componentError: ComponentError) {
        TODO("Not yet implemented")
    }

    fun onSubmit(state: Any) {
        TODO("Not yet implemented")
    }
}
