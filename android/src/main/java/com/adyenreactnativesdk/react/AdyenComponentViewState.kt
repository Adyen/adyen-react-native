/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import android.util.Log
import android.util.Size
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import com.adyen.checkout.core.components.CheckoutPaymentFlow
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.ControllerViewBinding
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutChangeEvent
import com.adyenreactnativesdk.react.base.LayoutListener
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper

private const val TAG = "AdyenComponentViewState"

/**
 * Per-view state for one Fabric view bound to a registry controller. The coordinator owns the
 * controller; this state owns only its local Compose tree and its view binding. Mounting never
 * creates a controller and unmounting never disposes one.
 */
class AdyenComponentViewState(
  private val context: ThemedReactContext,
) : LayoutListener {
  var checkoutId: String? = null
  var controllerId: String? = null

  private var binding: Binding? = null

  private class Binding(
    val checkoutId: String,
    val controllerId: String,
    private val onDetach: (Binding) -> Unit,
  ) : ControllerViewBinding {
    override fun detach() = onDetach(this)
  }

  /** Applies the complete Fabric tuple atomically after all prop setters have run. */
  fun updateRegistration(view: DynamicComponentView) {
    val checkoutId = checkoutId
    val controllerId = controllerId
    val activity = context.currentActivity
    if (checkoutId.isNullOrBlank() || controllerId.isNullOrBlank() || activity == null) {
      dispose(view)
      return
    }
    val current = binding
    if (current != null && current.checkoutId == checkoutId && current.controllerId == controllerId) return

    dispose(view)
    val created =
      Binding(checkoutId, controllerId) { detached ->
        // The coordinator disposed the controller; drop its UI without unbinding again.
        if (binding === detached) {
          binding = null
          view.onDispose()
        }
      }
    val controller =
      try {
        CheckoutCoordinator.shared
          .bindControllerView(checkoutId, controllerId, created)
          .checkoutController
      } catch (exception: IllegalStateException) {
        Log.w(TAG, "Embedded controller is stale, unknown, or already bound to another view", exception)
        return
      }
    binding = created
    if (controller == null) return
    val composeView =
      ComposeView(activity).apply {
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindowOrReleasedFromPool)
        setContent {
          CheckoutPaymentFlow(controller = controller)
        }
      }
    view.setView(composeView)
  }

  override fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    eventDispatcher?.dispatchEvent(LayoutChangeEvent(surfaceId, viewId, size.width, size.height))
  }

  /** Detaches this view from its controller without disposing the controller. */
  fun dispose(view: DynamicComponentView) {
    view.onDispose()
    val current = binding ?: return
    binding = null
    CheckoutCoordinator.shared.unbindControllerView(current.controllerId, current)
  }
}
