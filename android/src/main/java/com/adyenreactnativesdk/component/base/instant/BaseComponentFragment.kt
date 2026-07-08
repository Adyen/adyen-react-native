/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.instant

import android.app.Dialog
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import androidx.core.os.BundleCompat
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.core.Environment
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyen.checkout.sessions.core.SessionSetupResponse
import com.adyenreactnativesdk.R
import com.adyenreactnativesdk.component.base.ComponentData
import com.adyenreactnativesdk.component.base.ComponentEvent
import com.adyenreactnativesdk.component.base.viewmodel.AdvancedComponentViewModel
import com.adyenreactnativesdk.component.base.viewmodel.SessionsComponentViewModel
import com.adyenreactnativesdk.component.base.viewmodel.ViewModelInterface
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import kotlinx.coroutines.launch

/**
 * Base class for all instant/component bottom sheets.
 *
 * Kept to a no-argument constructor on purpose: [FragmentManager] recreates fragments via
 * reflection on config changes and process restoration, and only ever calls the no-arg
 * constructor before restoring [getArguments]. All payment state is therefore passed through
 * [arguments] instead of the constructor.
 */
abstract class BaseComponentFragment<TComponent, TState : PaymentComponentState<*>> :
  BottomSheetDialogFragment() where TComponent : Component,
        TComponent : ActionHandlingComponent {
  var component: TComponent? = null

  protected val configuration: CheckoutConfiguration by lazy {
    BundleCompat.getParcelable(requireArguments(), KEY_CONFIGURATION, CheckoutConfiguration::class.java)
      ?: throw IllegalStateException("Missing $KEY_CONFIGURATION argument")
  }

  protected val paymentMethod: PaymentMethod by lazy {
    BundleCompat.getParcelable(requireArguments(), KEY_PAYMENT_METHOD, PaymentMethod::class.java)
      ?: throw IllegalStateException("Missing $KEY_PAYMENT_METHOD argument")
  }

  protected val session: CheckoutSession? by lazy {
    sessionFromArguments(requireArguments())
  }

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

  override fun onCancel(dialog: DialogInterface) {
    super.onCancel(dialog)
    viewModel.cancel()
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
    view.findViewById<ImageButton>(R.id.close_button)?.setOnClickListener {
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

    private const val KEY_CONFIGURATION = "KEY_CONFIGURATION"
    private const val KEY_PAYMENT_METHOD = "KEY_PAYMENT_METHOD"
    private const val KEY_SESSION_SETUP_RESPONSE = "KEY_SESSION_SETUP_RESPONSE"
    private const val KEY_SESSION_ORDER = "KEY_SESSION_ORDER"
    private const val KEY_SESSION_ENVIRONMENT = "KEY_SESSION_ENVIRONMENT"
    private const val KEY_SESSION_CLIENT_KEY = "KEY_SESSION_CLIENT_KEY"

    /**
     * Builds the [Bundle] carrying the payment state as [android.os.Parcelable] arguments so it
     * survives fragment re-creation. [CheckoutSession] itself isn't Parcelable, so it's split into
     * its Parcelable parts and reassembled by [sessionFromArguments].
     */
    fun buildArguments(
      configuration: CheckoutConfiguration,
      paymentMethod: PaymentMethod,
      session: CheckoutSession?,
    ): Bundle =
      Bundle().apply {
        putParcelable(KEY_CONFIGURATION, configuration)
        putParcelable(KEY_PAYMENT_METHOD, paymentMethod)
        session?.let {
          putParcelable(KEY_SESSION_SETUP_RESPONSE, it.sessionSetupResponse)
          putParcelable(KEY_SESSION_ORDER, it.order)
          putParcelable(KEY_SESSION_ENVIRONMENT, it.environment)
          putString(KEY_SESSION_CLIENT_KEY, it.clientKey)
        }
      }

    private fun sessionFromArguments(arguments: Bundle): CheckoutSession? {
      val sessionSetupResponse =
        BundleCompat.getParcelable(arguments, KEY_SESSION_SETUP_RESPONSE, SessionSetupResponse::class.java)
          ?: return null
      val environment =
        BundleCompat.getParcelable(arguments, KEY_SESSION_ENVIRONMENT, Environment::class.java)
          ?: return null
      val clientKey = arguments.getString(KEY_SESSION_CLIENT_KEY) ?: return null
      val order = BundleCompat.getParcelable(arguments, KEY_SESSION_ORDER, Order::class.java)
      return CheckoutSession(sessionSetupResponse, order, environment, clientKey)
    }

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
