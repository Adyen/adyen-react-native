/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.AdvancedCheckoutCallbacks
import com.adyen.checkout.core.components.BeforeSubmitResult
import com.adyen.checkout.core.components.CheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutCallbacks
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.util.messaging.MessageBus
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Receives native callback data for the generated checkout control module. */
internal interface ComponentEventSink {
  /** Invoked at the first native payment callback before a generated request is emitted. */
  fun onInteractionStarted(): Boolean

  fun onAdvancedSubmit(data: PaymentComponentData<*>)

  fun onAdvancedAdditionalDetails(data: ActionComponentData)

  fun onSessionComplete(result: SessionCheckoutResult)

  fun onComplete(resultCode: String)

  fun onError()
}

/**
 * Builds and drives a [CheckoutController] for any payment method.
 */
internal class ComponentManager(
  private val activity: FragmentActivity,
  private val messageBus: MessageBus?,
  private val additionalCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val additionalSessionCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val sessionBeforeSubmitBridge: SessionBeforeSubmitBridge? = null,
  private val eventSink: ComponentEventSink? = null,
  /** Exact coordinator presenter or operation identity that owns redirect returns. */
  private val redirectOwnerId: String? = null,
  /** Called on terminal state (complete/failure) so a headless caller can dismiss its UI. */
  private val onTerminal: (() -> Unit)? = null,
) {
  var checkoutController: CheckoutController? = null
    private set

  private var submitContinuation: CancellableContinuation<SubmitResult>? = null
  private var additionalDetailsContinuation: CancellableContinuation<AdditionalDetailsResult>? = null
  private var disposed = false
  private var terminalHandled = false

  /** Whether this manager is suspended waiting on a submit/additionalDetails result from JS. */
  val isAwaitingResult: Boolean
    get() = submitContinuation != null || additionalDetailsContinuation != null

  suspend fun createController(
    context: CheckoutContext,
    paymentMethodType: String,
  ): CheckoutController? = createController(context, CheckoutTarget.PaymentMethod(paymentMethodType))

  suspend fun createController(
    context: CheckoutContext,
    target: CheckoutTarget,
  ): CheckoutController? {
    if (disposed) return null
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
          messageBus?.onException(ModuleException.Unknown("Unsupported checkout context type"))
          null
        }
      }
    if (disposed) return null
    checkoutController = controller
    controller?.let { controller ->
      redirectOwnerId?.let { CheckoutCoordinator.shared.registerRedirectController(controller, it) }
    }
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
    if (disposed) return
    disposed = true
    submitContinuation?.let {
      submitContinuation = null
      it.resume(SubmitResult.Retry(null))
    }
    additionalDetailsContinuation?.let {
      additionalDetailsContinuation = null
      it.resume(AdditionalDetailsResult.Completion(CheckoutResultCode.ERROR.value))
    }
    checkoutController?.let { CheckoutCoordinator.shared.unregisterRedirectController(it) }
    checkoutController = null
  }

  private fun advancedCallbacks(): AdvancedCheckoutCallbacks {
    val block = additionalCallbacks
    return AdvancedCheckoutCallbacks(
      onSubmit = { data ->
        suspendCancellableCoroutine { continuation ->
          submitContinuation = continuation
          eventSink?.let {
            if (it.onInteractionStarted()) {
              it.onAdvancedSubmit(data)
            } else {
              submitContinuation = null
              continuation.resume(SubmitResult.Retry(null))
            }
          } ?: messageBus?.onSubmit(data)
        }
      },
      onAdditionalDetails = { data ->
        suspendCancellableCoroutine { continuation ->
          additionalDetailsContinuation = continuation
          eventSink?.onAdvancedAdditionalDetails(data) ?: messageBus?.onAdditionalDetails(data)
        }
      },
      onFailure = { error ->
        if (eventSink == null) {
          messageBus?.onException(error.toModuleException())
        } else {
          eventSink.onError()
        }
        notifyTerminal()
      },
      onComplete = { result ->
        if (eventSink == null) {
          messageBus?.onFinished(result.resultCode.value)
        } else {
          eventSink.onComplete(result.resultCode.value)
        }
        notifyTerminal()
      },
      additionalCallbacksBlock = block ?: defaultBlock,
    )
  }

  private fun sessionCallbacks(): SessionCheckoutCallbacks {
    val block = additionalSessionCallbacks
    return SessionCheckoutCallbacks(
      onComplete = { result ->
        if (eventSink == null) {
          messageBus?.onFinished(result)
        } else {
          if (eventSink.onInteractionStarted()) {
            eventSink.onSessionComplete(result)
          }
        }
        notifyTerminal()
      },
      onFailure = { error ->
        if (eventSink == null) {
          messageBus?.onSessionException(error.toModuleException())
        } else {
          eventSink.onError()
        }
        notifyTerminal()
      },
      onBeforeSubmit =
        sessionBeforeSubmitBridge?.let { bridge ->
          { data ->
            if (eventSink == null || eventSink.onInteractionStarted()) {
              bridge.onBeforeSubmit(data)
            } else {
              BeforeSubmitResult.Abort()
            }
          }
        },
      additionalCallbacksBlock = block ?: defaultBlock,
    )
  }

  private val defaultBlock: CheckoutCallbacks.() -> Unit = {}

  private fun notifyTerminal() {
    if (terminalHandled) return
    terminalHandled = true
    onTerminal?.invoke()
  }
}
