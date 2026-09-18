/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.AdvancedCheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutCallbacks
import com.adyen.checkout.core.components.SubmitResult
import com.adyenreactnativesdk.CheckoutControllerRegistry
import com.adyenreactnativesdk.util.messaging.MessageBus
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Builds and drives a [CheckoutController] for any payment method.
 */
internal class ComponentManager(
  private val activity: FragmentActivity,
  private val messageBus: MessageBus,
  private val additionalCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val additionalSessionCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val sessionBeforeSubmitBridge: SessionBeforeSubmitBridge? = null,
  /** Called on terminal state (complete/failure) so a headless caller can dismiss its UI. */
  private val onTerminal: (() -> Unit)? = null,
) {
  var checkoutController: CheckoutController? = null
    private set

  private var submitContinuation: CancellableContinuation<SubmitResult>? = null
  private var additionalDetailsContinuation: CancellableContinuation<AdditionalDetailsResult>? = null

  /** Whether this manager is suspended waiting on a submit/additionalDetails result from JS. */
  val isAwaitingResult: Boolean
    get() = submitContinuation != null || additionalDetailsContinuation != null

  suspend fun createController(
    context: CheckoutContext,
    paymentMethodType: String,
  ): CheckoutController? {
    val target = CheckoutTarget.PaymentMethod(paymentMethodType)
    val controller =
      when (context) {
        is CheckoutContext.Sessions -> {
          CheckoutController(
            target = target,
            context = context,
            callbacks = sessionCallbacks(),
            coroutineScope = activity.lifecycleScope,
          )
        }

        is CheckoutContext.Advanced -> {
          CheckoutController(
            target = target,
            context = context,
            callbacks = advancedCallbacks(),
            coroutineScope = activity.lifecycleScope,
          )
        }

        else -> {
          messageBus.onException(ModuleException.Unknown("Unsupported checkout context type"))
          null
        }
      }
    checkoutController = controller
    controller?.let { CheckoutControllerRegistry.register(it) }
    return controller
  }

  fun handleAction(action: Action) {
    submitContinuation?.let {
      submitContinuation = null
      it.resume(SubmitResult.Action(action))
    }
  }

  fun completion(resultCode: String) {
    submitContinuation?.let {
      submitContinuation = null
      it.resume(SubmitResult.Completion(resultCode))
      return
    }
    additionalDetailsContinuation?.let {
      additionalDetailsContinuation = null
      it.resume(AdditionalDetailsResult.Completion(resultCode))
    }
  }

  fun retry(message: String?) {
    submitContinuation?.let {
      submitContinuation = null
      it.resume(SubmitResult.Retry(message))
    }
  }

  fun dispose() {
    submitContinuation?.let {
      submitContinuation = null
      it.resume(SubmitResult.Retry(null))
    }
    additionalDetailsContinuation?.let {
      additionalDetailsContinuation = null
      it.resume(AdditionalDetailsResult.Completion(CheckoutResultCode.ERROR.value))
    }
    checkoutController?.let { CheckoutControllerRegistry.unregister(it) }
    checkoutController = null
    onTerminal?.invoke()
  }

  private fun advancedCallbacks(): AdvancedCheckoutCallbacks {
    val block = additionalCallbacks
    return AdvancedCheckoutCallbacks(
      onSubmit = { data ->
        suspendCancellableCoroutine { continuation ->
          submitContinuation = continuation
          messageBus.onSubmit(data)
        }
      },
      onAdditionalDetails = { data ->
        suspendCancellableCoroutine { continuation ->
          additionalDetailsContinuation = continuation
          messageBus.onAdditionalDetails(data)
        }
      },
      onFailure = { error ->
        messageBus.onException(error.toModuleException())
        onTerminal?.invoke()
      },
      onComplete = { result ->
        messageBus.onFinished(result.resultCode.value)
        onTerminal?.invoke()
      },
      additionalCallbacksBlock = block ?: defaultBlock,
    )
  }

  private fun sessionCallbacks(): SessionCheckoutCallbacks {
    val block = additionalSessionCallbacks
    return SessionCheckoutCallbacks(
      onComplete = { result ->
        messageBus.onFinished(result)
        onTerminal?.invoke()
      },
      onFailure = { error ->
        messageBus.onSessionException(error.toModuleException())
        onTerminal?.invoke()
      },
      onBeforeSubmit = sessionBeforeSubmitBridge?.let { bridge -> { data -> bridge.onBeforeSubmit(data) } },
      additionalCallbacksBlock = block ?: defaultBlock,
    )
  }

  private val defaultBlock: CheckoutCallbacks.() -> Unit = {}
}
