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
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Generic [BottomSheetDialogFragment] host for [CheckoutPaymentFlow] composable, replacing
 * the former per-flow fragments (`ActionFragment`, `GooglePayFragment`). Configured per-tag via [show].
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
      // TODO: temporary close button for actions with no UI of their own (e.g. redirect); revisit
      // once upstream (ui-core) offers a proper cancel/loading affordance.
      if (config.cancellable) {
        CloseButton(onClick = { dialog?.cancel() })
      }
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
