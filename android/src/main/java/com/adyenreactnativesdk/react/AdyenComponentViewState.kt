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
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.card.card
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.CheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutPaymentFlow
import com.adyenreactnativesdk.component.ComponentModule
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutChangeEvent
import com.adyenreactnativesdk.react.base.LayoutListener
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.adyenreactnativesdk.util.messaging.TaggedEmitter
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import kotlinx.coroutines.launch

private const val SCHEME = "scheme"
private const val TAG = "AdyenComponentViewState"

/**
 * Per-view state for the generic embedded `<AdyenComponent>` view. Owns the [ComponentManager]
 * that builds the v6 [com.adyen.checkout.core.components.CheckoutController] for the payment method
 * identified by [type] and renders it through the `CheckoutPaymentFlow` composable hosted in a
 * [ComposeView].
 */
class AdyenComponentViewState(
  val context: ThemedReactContext,
  val emitter: MessageBusEmitter,
) : LayoutListener,
  ComponentContract {
  var type: String? = null
  var configuration: String? = null
  val activity: FragmentActivity =
    context.currentActivity as? FragmentActivity
      ?: throw IllegalStateException("AdyenComponent requires a FragmentActivity")
  private var componentManager: ComponentManager? = null

  fun renderView(dynamicComponentView: DynamicComponentView) {
    val paymentMethodType = type ?: return
    val state = BaseModule.checkoutState
    if (state == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
      return
    }
    val checkoutContext = state.checkoutContext

    val viewId = dynamicComponentView.id.toString()
    val bus = MessageBus(TaggedEmitter(emitter, viewId))
    // BIN callbacks only exist on the card configuration; wire them exclusively for card views.
    val cardCallbackBlock: (CheckoutCallbacks.() -> Unit)? =
      if (paymentMethodType == SCHEME) {
        {
          card(
            onBinChange = { binValue -> bus.onBinValue(binValue) },
            onBinLookup = { data -> bus.onBinLookup(listOf(data)) },
          )
        }
      } else {
        null
      }
    val manager =
      ComponentManager(
        activity = activity,
        messageBus = bus,
        additionalCallbacks = cardCallbackBlock,
        additionalSessionCallbacks = cardCallbackBlock,
        sessionBeforeSubmitBridge = state.sessionBeforeSubmitBridge,
      )
    componentManager = manager
    ComponentModule.register(viewId, this)

    val composeView =
      ComposeView(activity).apply {
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
      }
    dynamicComponentView.setView(composeView)

    activity.lifecycleScope.launch {
      val controller = manager.createController(checkoutContext, paymentMethodType) ?: return@launch
      composeView.setContent {
        CheckoutPaymentFlow(controller = controller)
      }
    }
  }

  override fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    val event = LayoutChangeEvent(surfaceId, viewId, size.width, size.height)
    eventDispatcher?.dispatchEvent(event)
  }

  override fun onAction(action: Action) {
    componentManager?.handleAction(action)
  }

  override fun onFinalResult(
    success: Boolean,
    message: String?,
  ): Boolean {
    val manager = componentManager ?: return false
    return when {
      success -> {
        manager.completion(CheckoutResultCode.AUTHORISED.value)
        false
      }

      message != null -> {
        manager.retry(message)
        true
      }

      else -> {
        manager.completion(CheckoutResultCode.REFUSED.value)
        false
      }
    }
  }

  fun dispose(dynamicComponentView: DynamicComponentView) {
    dynamicComponentView.onDispose()
    configuration = null
    type = null
    ComponentModule.unregister(dynamicComponentView.id.toString())
    componentManager?.dispose()
    componentManager = null
  }
}
