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
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutPaymentFlow
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Generic host for the v6 [CheckoutPaymentFlow] composable.
 *
 * Both the action-only flow and the Google Pay flow need a [BottomSheetDialogFragment] that
 * renders the composable. This single fragment replaces the former per-flow fragments
 * (`ActionFragment`, `GooglePayFragment`) by parameterising the differences:
 *
 * - **controllerProvider** – resolves the [CheckoutController] to render.
 * - **cancellable** – whether the dialog can be dismissed by the user.
 * - **autoSubmit** – when `true`, calls [CheckoutController.submit] once after the composable
 *   is set up (used by Google Pay to launch the sheet immediately).
 * - **onCancelled** – optional callback invoked when the user cancels the dialog.
 *
 * Configuration is stored per-tag in the companion so multiple callers can coexist.
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

    val fragmentTag =
      tag ?: run {
        dismissAllowingStateLoss()
        return
      }
    val config =
      configs[fragmentTag] ?: run {
        dismissAllowingStateLoss()
        return
      }

    isCancelable = config.cancellable

    val controller = config.controllerProvider()
    if (controller == null) {
      dismissAllowingStateLoss()
      return
    }

    (view as ComposeView).setContent {
      CheckoutPaymentFlow(controller = controller)
    }

    if (config.autoSubmit && !submitted && !controller.requiresUserInteraction()) {
      submitted = true
      controller.submit()
    }
  }

  override fun onCancel(dialog: DialogInterface) {
    super.onCancel(dialog)
    val fragmentTag = tag ?: return
    configs[fragmentTag]?.onCancelled?.invoke()
  }

  companion object {
    private data class FragmentConfig(
      val controllerProvider: () -> CheckoutController?,
      val cancellable: Boolean,
      val autoSubmit: Boolean,
      val onCancelled: (() -> Unit)?,
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

    fun hide(
      fragmentManager: FragmentManager,
      tag: String,
    ) {
      configs.remove(tag)
      (fragmentManager.findFragmentByTag(tag) as? CheckoutFragment)?.dismissAllowingStateLoss()
    }
  }
}
