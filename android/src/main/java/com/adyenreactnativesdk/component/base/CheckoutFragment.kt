/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutPaymentFlow
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Generic [BottomSheetDialogFragment] host for [CheckoutPaymentFlow] composable, replacing
 * the former per-flow fragments (`ActionFragment`, `GooglePayFragment`).
 *
 * Checkout-owned fragments receive only an operation identifier in arguments. They resolve the
 * live controller and flags from [CheckoutCoordinator], which lets Android recreate the fragment
 * without serializing controller state into a Bundle or retaining it in this class.
 */
class CheckoutFragment : BottomSheetDialogFragment() {
  private var submitted = false

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
  ): View =
    ComposeView(requireContext()).apply {
      setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
    }

  override fun onViewCreated(
    view: View,
    savedInstanceState: Bundle?,
  ) {
    super.onViewCreated(view, savedInstanceState)
    dialog?.setCanceledOnTouchOutside(false)

    val operationId = arguments?.getString(ARG_OPERATION_ID)
    if (savedInstanceState != null && operationId != null) {
      // The FragmentManager restored this host for a new Activity. Its controller and redirect
      // route belonged to the destroyed Activity, so dismiss rather than resurrecting either.
      CheckoutCoordinator.shared.invalidateRestoredFragment(operationId)
      dismissAllowingStateLoss()
      return
    }
    val fragmentTag = tag
    val coordinatorConfig =
      operationId?.let {
        CoordinatorFragmentConfig(
          controller = CheckoutCoordinator.shared.fragmentController(it),
          cancellable = CheckoutCoordinator.shared.fragmentCancellable(it),
          autoSubmit = CheckoutCoordinator.shared.fragmentAutoSubmit(it),
        )
      }
    val legacyConfig =
      fragmentTag?.let(configs::get)
    val controller =
      coordinatorConfig?.controller
        ?: legacyConfig?.controllerProvider?.invoke()
    val cancellable =
      coordinatorConfig?.cancellable
        ?: legacyConfig?.cancellable
        ?: false
    val autoSubmit =
      coordinatorConfig?.autoSubmit
        ?: legacyConfig?.autoSubmit
        ?: false
    if (coordinatorConfig == null && legacyConfig == null) {
      dismissAllowingStateLoss()
      return
    }

    isCancelable = cancellable

    if (controller == null) {
      dismissAllowingStateLoss()
      return
    }

    (view as ComposeView).setContent {
      CheckoutPaymentFlow(controller = controller)
      // TODO: temporary close button for actions with no UI of their own (e.g. redirect); revisit
      // once upstream (ui-core) offers a proper cancel/loading affordance.
      if (cancellable) {
        CloseButton(onClick = { dialog?.cancel() })
      }
    }

    if (autoSubmit && !submitted && !controller.requiresUserInteraction()) {
      submitted = true
      controller.submit()
    }
  }

  override fun onCancel(dialog: DialogInterface) {
    super.onCancel(dialog)
    arguments?.getString(ARG_OPERATION_ID)?.let(CheckoutCoordinator.shared::fragmentCancelled)
      ?: tag?.let { configs[it]?.onCancelled?.invoke() }
  }

  override fun onDismiss(dialog: DialogInterface) {
    super.onDismiss(dialog)
    arguments?.getString(ARG_OPERATION_ID)?.let(CheckoutCoordinator.shared::fragmentDismissed)
      ?: tag?.let { configs.remove(it)?.onDismissed?.invoke() }
  }

  @Suppress("ktlint:standard:function-naming")
  @Composable
  private fun CloseButton(onClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.TopEnd) {
      BasicText(text = "✕", modifier = Modifier.clickable(onClick = onClick).padding(8.dp))
    }
  }

  companion object {
    private data class FragmentConfig(
      val controllerProvider: () -> CheckoutController?,
      val cancellable: Boolean,
      val autoSubmit: Boolean,
      val onCancelled: (() -> Unit)?,
      val onDismissed: (() -> Unit)? = null,
    )

    private data class CoordinatorFragmentConfig(
      val controller: CheckoutController?,
      val cancellable: Boolean,
      val autoSubmit: Boolean,
    )

    private val configs = mutableMapOf<String, FragmentConfig>()

    fun show(
      fragmentManager: FragmentManager,
      tag: String,
      controllerProvider: () -> CheckoutController?,
      cancellable: Boolean = true,
      autoSubmit: Boolean = false,
      onCancelled: (() -> Unit)? = null,
    ) {
      configs[tag] =
        FragmentConfig(
          controllerProvider = controllerProvider,
          cancellable = cancellable,
          autoSubmit = autoSubmit,
          onCancelled = onCancelled,
        )
      CheckoutFragment().show(fragmentManager, tag)
    }

    /**
     * Shows a checkout-owned host. The only Fragment argument is the private operation ID;
     * controller ownership remains in [CheckoutCoordinator] while its Activity is alive.
     * Restoring this Fragment after Activity destruction invalidates stale checkout work instead
     * of resurrecting an Activity-scoped controller.
     */
    fun showCoordinator(
      fragmentManager: FragmentManager,
      operationId: String,
      cancellable: Boolean = true,
      autoSubmit: Boolean = false,
      onCancelled: () -> Unit,
    ) {
      CheckoutCoordinator.shared.registerFragmentPresentation(
        operationId = operationId,
        cancellable = cancellable,
        autoSubmit = autoSubmit,
        onCancelled = onCancelled,
      )
      forCoordinator(operationId).show(fragmentManager, "$COORDINATOR_TAG_PREFIX-$operationId")
    }

    /** Creates an identifier-only fragment so system recreation resolves live state from the coordinator. */
    internal fun forCoordinator(operationId: String): CheckoutFragment =
      CheckoutFragment().apply {
        arguments =
          Bundle().apply {
            putString(ARG_OPERATION_ID, operationId)
          }
      }

    fun hide(
      fragmentManager: FragmentManager,
      tag: String,
      onDismissed: (() -> Unit)? = null,
    ) {
      val currentConfig = configs[tag]
      currentConfig?.let {
        configs[tag] =
          it.copy(
            onDismissed = onDismissed,
          )
      }
      val fragment = fragmentManager.findFragmentByTag(tag) as? CheckoutFragment
      val committedFragment =
        fragment
          ?: run {
            fragmentManager.executePendingTransactions()
            fragmentManager.findFragmentByTag(tag) as? CheckoutFragment
          }
      if (committedFragment == null) {
        (configs.remove(tag)?.onDismissed ?: onDismissed)?.invoke()
        return
      }
      committedFragment.dismissAllowingStateLoss()
    }

    const val COORDINATOR_TAG_PREFIX = "TurboCheckout"
    private const val ARG_OPERATION_ID = "operationId"
  }
}
