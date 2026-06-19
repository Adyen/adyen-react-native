/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.instant

import android.app.Dialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ComponentEvent
import com.adyenreactnativesdk.component.base.viewmodel.AdvancedComponentViewModel
import com.adyenreactnativesdk.component.base.viewmodel.SessionsComponentViewModel
import com.adyenreactnativesdk.component.base.viewmodel.ViewModelInterface
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.launch

abstract class BaseComponentFragment<TComponent, TState : PaymentComponentState<*>>(
  private val paymentMethod: PaymentMethod,
  protected var session: CheckoutSession? = null,
) : BottomSheetDialogFragment() where TComponent : Component,
        TComponent : ActionHandlingComponent {
  var component: TComponent? = null

  private val advancedViewModel: AdvancedComponentViewModel<TState> by viewModels()
  private val sessionViewModel: SessionsComponentViewModel<TState> by viewModels()

  internal val viewModel: ViewModelInterface<TState>
    get() {
      return if (session == null) advancedViewModel else sessionViewModel
    }

  override fun onCreateDialog(savedInstanceState: Bundle?): Dialog =
    super.onCreateDialog(savedInstanceState).also {
      it.setCanceledOnTouchOutside(false)
    }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
  ): View = inflater.inflate(R.layout.fragment_instant, container)

  override fun onViewCreated(
    view: View,
    savedInstanceState: Bundle?,
  ) {
    super.onViewCreated(view, savedInstanceState)
    view.findViewById<ImageButton>(R.id.close_button).setOnClickListener {
      viewModel.cancel()
    }
    viewLifecycleOwner.lifecycleScope.launch {
      repeatOnLifecycle(Lifecycle.State.STARTED) {
        launch { viewModel.componentDataFlow.collect(::setupComponent) }
        launch { viewModel.events.collect(::onEvent) }
      }
    }

    viewModel.startPayment(paymentMethod, session)
  }

  abstract fun setupComponent(componentData: ComponentData<TState>)

  open fun runComponent() {
    // No-op: subclasses may override to start the component lifecycle
  }

  private fun onEvent(event: ComponentEvent) {
    when (event) {
      is ComponentEvent.AdditionalAction -> {
        component?.handleAction(event.action, requireActivity())
      }

      is ComponentEvent.ComponentCreated -> {
        runComponent()
      }
    }
  }

  override fun onDestroyView() {
    super.onDestroyView()
    component = null
  }

  companion object {
    const val FRAGMENT_ERROR =
      "Not able to find AdyenComponentView in `component_view` fragment"

    fun handle(
      fragmentManager: FragmentManager,
      action: Action,
      tag: String,
    ) {
      val fragment = fragmentManager.findFragmentByTag(tag) as? BaseComponentFragment<*, *>
      fragment?.isCancelable = false
      fragment?.viewModel?.onAction(action)
    }

    fun hide(
      fragmentManager: FragmentManager,
      tag: String,
    ) {
      val fragment = fragmentManager.findFragmentByTag(tag) as? BottomSheetDialogFragment
      fragment?.dismiss()
    }
  }
}
