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
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
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

/** Constructs the SDK controller; an internal seam so native tests can supply doubles. */
internal fun interface NativeControllerFactory {
  fun create(
    target: CheckoutTarget,
    context: CheckoutContext,
    callbacks: CheckoutCallbacks,
    coroutineScope: CoroutineScope,
  ): CheckoutController?
}

internal object SdkControllerFactory : NativeControllerFactory {
  override fun create(
    target: CheckoutTarget,
    context: CheckoutContext,
    callbacks: CheckoutCallbacks,
    coroutineScope: CoroutineScope,
  ): CheckoutController? =
    when (context) {
      is CheckoutContext.Sessions -> {
        CheckoutController(target, context, callbacks as SessionCheckoutCallbacks, coroutineScope)
      }

      is CheckoutContext.Advanced -> {
        CheckoutController(target, context, callbacks as AdvancedCheckoutCallbacks, coroutineScope)
      }

      else -> {
        null
      }
    }
}

/**
 * Builds and drives one [CheckoutController] for one exact payment method instance.
 */
internal class ComponentManager(
  private val activity: FragmentActivity,
  private val eventSink: ComponentEventSink,
  private val additionalCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val additionalSessionCallbacks: (CheckoutCallbacks.() -> Unit)? = null,
  private val sessionBeforeSubmitBridge: SessionBeforeSubmitBridge? = null,
  private val controllerFactory: NativeControllerFactory = SdkControllerFactory,
) {
  var checkoutController: CheckoutController? = null
    private set

  private var submitContinuation: CancellableContinuation<SubmitResult>? = null
  private var additionalDetailsContinuation: CancellableContinuation<AdditionalDetailsResult>? = null
  private var controllerScope: CoroutineScope? = null
  private var disposed = false
  private var isCreating = false
  private var creationFailed = false

  /** Whether this manager is suspended waiting on a submit/additionalDetails result from JS. */
  val isAwaitingResult: Boolean
    get() = submitContinuation != null || additionalDetailsContinuation != null

  /**
   * Creates the controller eagerly. The pinned SDK reports a payment method it cannot build in
   * two ways: a failed controller that fires `onFailure` synchronously during construction, or a
   * component factory that throws (e.g. Google Pay without a gateway merchant id). Both mean
   * "not creatable" here and are never forwarded as a checkout terminal error.
   */
  fun createController(
    context: CheckoutContext,
    target: CheckoutTarget,
  ): CheckoutController? {
    if (disposed) return null
    check(checkoutController == null) { "Controller is already created" }
    val callbacks: CheckoutCallbacks =
      when (context) {
        is CheckoutContext.Sessions -> sessionCallbacks()
        is CheckoutContext.Advanced -> advancedCallbacks()
        else -> return null
      }
    // A child scope lets a failed construction cancel whatever the SDK already launched without
    // cancelling the activity scope shared by every other controller.
    val scope = controllerScope()
    isCreating = true
    val controller =
      try {
        controllerFactory.create(target, context, callbacks, scope)
      } catch (_: Exception) {
        null
      } finally {
        isCreating = false
      }
    if (disposed || creationFailed || controller == null) {
      creationFailed = true
      scope.cancel()
      dispose()
      return null
    }
    controllerScope = scope
    checkoutController = controller
    return controller
  }

  /** Releases a controller whose construction succeeded but which cannot be registered. */
  fun discardController() {
    creationFailed = true
    controllerScope?.cancel()
    controllerScope = null
    dispose()
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
    // Resuming first releases every suspended callback exactly once; cancelling the child scope
    // then stops work the disposed controller still has in flight without touching its siblings.
    controllerScope?.cancel()
    controllerScope = null
  }

  private fun advancedCallbacks(): AdvancedCheckoutCallbacks {
    val block = additionalCallbacks
    return AdvancedCheckoutCallbacks(
      onSubmit = { data ->
        suspendCancellableCoroutine { continuation ->
          submitContinuation = continuation
          if (eventSink.onInteractionStarted()) {
            eventSink.onAdvancedSubmit(data)
          } else {
            submitContinuation = null
            continuation.resume(SubmitResult.Retry(null))
          }
        }
      },
      onAdditionalDetails = { data ->
        suspendCancellableCoroutine { continuation ->
          additionalDetailsContinuation = continuation
          eventSink.onAdvancedAdditionalDetails(data)
        }
      },
      onFailure = { _ -> onFailure() },
      onComplete = { result ->
        eventSink.onComplete(result.resultCode.value)
      },
      additionalCallbacksBlock = block ?: defaultBlock,
    )
  }

  private fun sessionCallbacks(): SessionCheckoutCallbacks {
    val block = additionalSessionCallbacks
    return SessionCheckoutCallbacks(
      onComplete = { result ->
        if (eventSink.onInteractionStarted()) {
          eventSink.onSessionComplete(result)
        }
      },
      onFailure = { _ -> onFailure() },
      onBeforeSubmit =
        sessionBeforeSubmitBridge?.let { bridge ->
          { data ->
            if (eventSink.onInteractionStarted()) {
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

  private fun controllerScope(): CoroutineScope {
    val parent = activity.lifecycleScope.coroutineContext
    return CoroutineScope(parent + SupervisorJob(parent[Job]))
  }

  private fun onFailure() {
    // The SDK may still hold the callbacks of an abandoned construction; its failures stay silent.
    if (isCreating || creationFailed) {
      creationFailed = true
      return
    }
    eventSink.reportTerminalFailure()
  }
}

/**
 * A native failure may be the first callback from an embedded controller. Acquire its anonymous
 * checkout-level operation before forwarding the terminal error so the presenter can clean up.
 * A competing callback deliberately emits no merchant event.
 */
internal fun ComponentEventSink.reportTerminalFailure() {
  if (onInteractionStarted()) {
    onError()
  }
}
