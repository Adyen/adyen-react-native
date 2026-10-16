/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import android.os.Looper
import android.util.Log
import androidx.annotation.MainThread
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyenreactnativesdk.component.base.CheckoutState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * Internal lifecycle seams. They are constructor dependencies for native tests and production
 * adapters, not JavaScript-exposed fault controls.
 */
internal interface CheckoutFactory {
  fun create(): CoordinatorCheckout
}

internal interface CoordinatorCheckout {
  fun dispose()
}

internal interface PresenterFactory {
  fun create(presentation: CoordinatorPresentation): CoordinatorPresenter
}

/** Owner of the interactive operation slot. It never owns a payment-method controller. */
internal interface CoordinatorPresenter {
  /** The current controller is consulted by an identifier-only fragment after recreation. */
  fun controller(): CheckoutController? = null

  fun dispose()
}

/**
 * One native payment-method controller owned by the coordinator registry. It lives exactly as
 * long as its checkout and is disposed once by the coordinator.
 */
internal interface RegisteredController {
  /** The SDK controller rendered by views and fragments; absent only for test doubles. */
  val checkoutController: CheckoutController?

  /** Resolved once, when the native controller is created. */
  val requiresUserInteraction: Boolean

  /** Routes this controller's callbacks to an explicit (submit) operation. */
  fun bindOperation(operationId: String)

  /** Stops routing callbacks to [operationId]; a later callback may claim an embedded slot. */
  fun releaseOperation(operationId: String)

  fun dispose()
}

/** A mounted view rendering a registry controller. The coordinator detaches it on disposal. */
internal fun interface ControllerViewBinding {
  fun detach()
}

internal data class ControllerRegistration(
  val controllerId: String,
  val requiresUserInteraction: Boolean,
)

/** The command addressed a checkout that is no longer the active one. */
internal class StaleCheckoutException : IllegalStateException("Stale checkout")

/** The command addressed a controller identity that this checkout never registered. */
internal class UnknownControllerException : IllegalStateException("Unknown controller")

/** Another live view already renders this controller. */
internal class ControllerAlreadyBoundException : IllegalStateException("Controller is already bound to a view")

/** Official Drop-in result types, decoupled from the SDK's activity-result callback. */
internal sealed interface CoordinatorDropInResult {
  data class Completed(
    val resultCode: String,
  ) : CoordinatorDropInResult

  data class Failed(
    val message: String,
  ) : CoordinatorDropInResult

  data object Cancelled : CoordinatorDropInResult
}

/** Activity-result registration belongs to the active coordinator, not a static module launcher. */
internal interface CoordinatorDropInLauncher {
  fun start(
    context: CheckoutContext,
    onResult: (CoordinatorDropInResult) -> Unit,
  )

  fun clearResult()
}

/** Drop-in owns its submit/details bridge while its activity is visible. */
internal interface CoordinatorDropInPresenter {
  fun onDropInResult(result: CoordinatorDropInResult)
}

/** Private identity supplied to presenter factories, never exposed through the public bridge. */
internal data class CoordinatorPresentation(
  val checkoutId: String,
  val operationId: String?,
  val isDropIn: Boolean = false,
)

internal interface CheckoutEventSink {
  fun emit(event: CoordinatorEvent)
}

internal interface CheckoutIdentityGenerator {
  fun next(kind: CoordinatorIdentityKind): String
}

internal interface CheckoutScheduler {
  fun schedule(
    delayMillis: Long,
    action: () -> Unit,
  ): CoordinatorCancellation
}

internal interface CoordinatorCancellation {
  fun cancel()
}

internal interface CheckoutHostLauncherAdapter {
  fun releaseCheckoutHost()
}

internal data class CheckoutCoordinatorDependencies(
  val checkoutFactory: CheckoutFactory,
  val presenterFactory: PresenterFactory,
  val eventSink: CheckoutEventSink,
  val identityGenerator: CheckoutIdentityGenerator,
  val scheduler: CheckoutScheduler,
  val hostLauncherAdapter: CheckoutHostLauncherAdapter,
)

internal enum class CoordinatorIdentityKind {
  CHECKOUT,
  OPERATION,
  REQUEST,
  CONTROLLER,
}

internal enum class CoordinatorRequestKind {
  ADVANCED_SUBMIT,
  ADVANCED_ADDITIONAL_DETAILS,
  SESSION_BEFORE_SUBMIT,
  ADDRESS_LOOKUP,
  UNSUPPORTED_CAPABILITY,
}

internal data class CoordinatorRequest(
  val checkoutId: String,
  val operationId: String,
  val requestId: String,
  val kind: CoordinatorRequestKind,
)

internal sealed interface CoordinatorEvent {
  data class Activated(
    val checkoutId: String,
  ) : CoordinatorEvent

  data class Request(
    val request: CoordinatorRequest,
    val eventKind: String? = null,
    val payloadJson: String? = null,
  ) : CoordinatorEvent

  data class StaleRequest(
    val request: CoordinatorRequest,
  ) : CoordinatorEvent

  data class Terminal(
    val checkoutId: String,
    val kind: String,
    val payloadJson: String?,
  ) : CoordinatorEvent

  data object OperationBusy : CoordinatorEvent

  data class CleanedUp(
    val checkoutId: String,
  ) : CoordinatorEvent
}

/**
 * The one native owner for checkout state. All lifecycle transitions are serialized on Android's
 * main thread and one operation/request is retained at a time.
 */
internal class CheckoutCoordinator(
  private val configuredDependencies: CheckoutCoordinatorDependencies? = null,
) {
  companion object {
    /** The sole process-scoped owner for checkout lifecycle state. */
    val shared = CheckoutCoordinator()
    private const val TAG = "CheckoutCoordinator"
  }

  /** State of the committed checkout, read by presenters and the generated module. */
  var checkoutState: CheckoutState? = null
  private var runtimeDependencies: CheckoutCoordinatorDependencies? = null
  private val dependencies: CheckoutCoordinatorDependencies?
    get() = configuredDependencies ?: runtimeDependencies
  private val controllers = mutableMapOf<String, ControllerEntry>()
  private val controllerIdsByPaymentMethodId = mutableMapOf<String, String>()
  private val unavailablePaymentMethodIds = mutableSetOf<String>()
  private val redirectControllers = mutableMapOf<String, CheckoutController>()

  private var checkout: CoordinatorCheckout? = null
  private var checkoutId: String? = null
  private var presenter: CoordinatorPresenter? = null
  private var operationId: String? = null
  private var operationKind: OperationKind? = null
  private var dropInLauncher: CoordinatorDropInLauncher? = null
  private var request: CoordinatorRequest? = null
  private var requestEventKind: String? = null
  private var requestResponse: ((String?) -> Unit)? = null
  private var requestCancellation: CoordinatorCancellation? = null
  private var requestCancellationFallback: (() -> Unit)? = null
  private var isSettingUp = false
  private var isDisposing = false
  private var setupGeneration = 0
  private val fragmentPresentations = mutableMapOf<String, FragmentPresentation>()

  /** The generated module instance currently allowed to tear down this checkout. */
  private var lifecycleOwnerId: String? = null

  private class ControllerEntry(
    val checkoutId: String,
    val controller: RegisteredController,
  ) {
    var view: ControllerViewBinding? = null
  }

  /** Lends a registry controller to one explicit operation without transferring ownership. */
  private class ControllerOperationPresenter(
    private val operationId: String,
    private val registered: RegisteredController,
  ) : CoordinatorPresenter {
    private var released = false

    override fun controller(): CheckoutController? = if (released) null else registered.checkoutController

    override fun dispose() {
      if (released) return
      released = true
      registered.releaseOperation(operationId)
    }
  }

  private data class FragmentPresentation(
    val cancellable: Boolean,
    val autoSubmit: Boolean,
    val onCancelled: () -> Unit,
  )

  private enum class OperationKind {
    EXPLICIT,
    EMBEDDED,
    DROP_IN_SESSIONS,
    DROP_IN_ADVANCED,

    ;

    val isDropIn: Boolean
      get() = this == DROP_IN_SESSIONS || this == DROP_IN_ADVANCED
  }

  @MainThread
  fun activeCheckoutId(): String? = transition { checkoutId }

  @MainThread
  fun activeOperationId(): String? = transition { operationId }

  @MainThread
  fun isActive(checkoutId: String): Boolean = transition { this.checkoutId == checkoutId }

  /** Installs production adapters once the React runtime is available. Test coordinators retain
   * their constructor seams and cannot be reconfigured. */
  @MainThread
  fun configureRuntimeDependencies(dependencies: CheckoutCoordinatorDependencies) {
    transition {
      if (configuredDependencies == null) {
        runtimeDependencies = dependencies
      }
    }
  }

  /** Replacement disposes before creation; a factory exception leaves the owner idle. */
  @MainThread
  fun setup(): String =
    transition {
      val dependencies =
        checkNotNull(dependencies) {
          "CheckoutCoordinator test setup requires configured dependencies"
        }
      replaceLocked {
        dependencies.checkoutFactory.create()
      }
    }

  /**
   * Creates a checkout transactionally for the production bridge. The old flow is terminal before
   * [create] runs, and a failed candidate leaves the coordinator idle.
   */
  @MainThread
  fun setup(create: () -> CoordinatorCheckout): String =
    transition {
      replaceLocked(create)
    }

  /**
   * Suspended setup keeps the candidate private while the SDK initializes. A concurrent setup
   * observes [isSettingUp] and fails rather than replacing or publishing a partial candidate.
   */
  @MainThread
  suspend fun setupAsync(
    ownerId: String? = null,
    create: suspend () -> CoordinatorCheckout,
  ): String {
    transition {
      check(!isSettingUp) { "Checkout setup is already active" }
      invalidateLocked()
      lifecycleOwnerId = ownerId
      isSettingUp = true
      setupGeneration += 1
    }
    val generation = setupGeneration
    val createdCheckout =
      try {
        create()
      } catch (exception: Exception) {
        transition {
          if (setupGeneration == generation) {
            isSettingUp = false
            lifecycleOwnerId = null
          }
        }
        throw exception
      }

    return transition {
      if (!isSettingUp || setupGeneration != generation) {
        createdCheckout.dispose()
        throw IllegalStateException("Checkout setup became stale")
      }
      val createdCheckoutId = nextId(CoordinatorIdentityKind.CHECKOUT)
      checkout = createdCheckout
      checkoutId = createdCheckoutId
      checkoutState = (createdCheckout as? CheckoutStateOwner)?.checkoutState
      isSettingUp = false
      emit(CoordinatorEvent.Activated(createdCheckoutId))
      createdCheckoutId
    }
  }

  /**
   * Starts an explicit submit with the EXISTING registry controller. The controller is lent to
   * the operation presenter and remains registry-owned when the operation ends.
   */
  @MainThread
  fun beginControllerOperation(
    checkoutId: String,
    controllerId: String,
  ): String =
    transition {
      if (this.checkoutId != checkoutId || isDisposing) throw StaleCheckoutException()
      val entry = controllers[controllerId]?.takeIf { it.checkoutId == checkoutId } ?: throw UnknownControllerException()
      val createdOperationId =
        beginOperationLocked(OperationKind.EXPLICIT) { operationId ->
          ControllerOperationPresenter(operationId, entry.controller)
        }
      entry.controller.bindOperation(createdOperationId)
      entry.controller.checkoutController?.let { redirectControllers[createdOperationId] = it }
      createdOperationId
    }

  /** Whether [controllerId] is currently rendered by a mounted view. */
  @MainThread
  fun isControllerBound(controllerId: String): Boolean = transition { controllers[controllerId]?.view != null }

  /** Registers the official activity-result launcher owned by the currently active host. */
  @MainThread
  fun registerDropInLauncher(launcher: CoordinatorDropInLauncher) {
    transition {
      check(operationId == null) { "Cannot replace a Drop-in launcher while an operation is active" }
      dropInLauncher?.clearResult()
      dropInLauncher = launcher
    }
  }

  /**
   * Starts official Drop-in with the exact coordinator-owned [CheckoutContext]. The launcher
   * callback is identity-bound to this operation, so a late result cannot settle a replacement.
   */
  @MainThread
  fun beginDropIn(context: CheckoutContext): String {
    val launch =
      transition {
        val launcher = checkNotNull(dropInLauncher) { "No Drop-in launcher is registered" }
        val kind =
          when (context) {
            is CheckoutContext.Sessions -> {
              OperationKind.DROP_IN_SESSIONS
            }

            is CheckoutContext.Advanced -> {
              throw UnsupportedOperationException("Advanced Drop-in is unsupported by Android SDK 6.0.0-alpha.1")
            }

            is CheckoutContext.ActionOnly -> {
              error("Drop-in does not support action-only checkout contexts")
            }
          }
        val operationId = beginOperationLocked(kind)
        val dropInPresenter =
          presenter as? CoordinatorDropInPresenter
            ?: error("Drop-in presenter is not configured")
        Triple(operationId, launcher, dropInPresenter)
      }
    try {
      launch.second.start(context) { result ->
        finishDropIn(launch.first, launch.third, result)
      }
      return launch.first
    } catch (exception: Exception) {
      completeOperation(launch.first)
      throw exception
    }
  }

  /**
   * Acquires an anonymous checkout-level operation at the first embedded SDK callback. There is
   * intentionally no presenter, target, or registration lookup in this path.
   */
  @MainThread
  fun acquireEmbeddedOperation(checkoutId: String): String? =
    transition {
      if (this.checkoutId != checkoutId) return@transition null
      if (operationId != null) {
        Log.wtf(TAG, "Assertion failure: competing embedded checkout callback")
        return@transition null
      }
      nextId(CoordinatorIdentityKind.OPERATION).also {
        operationId = it
        operationKind = OperationKind.EMBEDDED
      }
    }

  /** Advanced retry releases only anonymous embedded ownership. Action/details keep it active. */
  @MainThread
  fun releaseEmbeddedOperation(operationId: String) {
    transition {
      if (this.operationId != operationId || operationKind != OperationKind.EMBEDDED) return@transition
      settleRequestLocked(invokeFallback = true)
      redirectControllers.remove(operationId)
      fragmentPresentations.remove(operationId)
      this.operationId = null
      operationKind = null
    }
  }

  @MainThread
  fun beginRequest(
    operationId: String,
    kind: CoordinatorRequestKind,
    timeoutMillis: Long,
    eventKind: String? = null,
    payloadJson: String? = null,
    cancellationFallback: () -> Unit = {},
    response: ((String?) -> Unit)? = null,
  ): CoordinatorRequest =
    transition {
      val currentCheckoutId = checkNotNull(checkoutId) { "No active checkout" }
      check(this.operationId == operationId) { "Stale operation" }
      settleRequestLocked(invokeFallback = true)
      val createdRequest =
        CoordinatorRequest(
          checkoutId = currentCheckoutId,
          operationId = operationId,
          requestId = nextId(CoordinatorIdentityKind.REQUEST),
          kind = kind,
        )
      request = createdRequest
      requestEventKind = eventKind
      requestResponse = response
      requestCancellation =
        dependencies?.scheduler?.schedule(timeoutMillis) {
          timeout(createdRequest)
        }
      requestCancellationFallback = cancellationFallback
      try {
        emit(CoordinatorEvent.Request(createdRequest, eventKind, payloadJson))
      } catch (exception: Exception) {
        settleRequestLocked(createdRequest, invokeFallback = true)
        throw exception
      }
      createdRequest
    }

  /** Returns false for stale, duplicate, wrong-kind, or late responses. */
  @MainThread
  fun resolve(
    candidate: CoordinatorRequest,
    payloadJson: String? = null,
  ): Boolean {
    var matched = false
    val response =
      transition {
        if (request != candidate) {
          emit(CoordinatorEvent.StaleRequest(candidate))
          null
        } else {
          matched = true
          val handler = requestResponse
          settleRequestLocked()
          handler
        }
      }
    if (!matched) return false
    response?.invoke(payloadJson)
    return true
  }

  @MainThread
  fun activeRequest(): CoordinatorRequest? = transition { request }

  @MainThread
  fun activeRequestEventKind(): String? = transition { requestEventKind }

  /**
   * The official SDK creates [SessionCheckoutCallbacks] for a sessions Drop-in, so it must never
   * ask the service to submit payment data or additional details. A pinned-SDK regression that
   * does so is rejected locally without emitting an advanced bridge event or touching the session
   * before-submit owner.
   */
  @MainThread
  suspend fun onDropInSubmit(data: PaymentComponentData<*>): SubmitResult =
    withContext(Dispatchers.Main.immediate) {
      transition { Unit }
      SubmitResult.Retry(null)
    }

  @MainThread
  suspend fun onDropInAdditionalDetails(data: ActionComponentData): AdditionalDetailsResult =
    withContext(Dispatchers.Main.immediate) {
      transition { Unit }
      AdditionalDetailsResult.Completion("Error")
    }

  @MainThread
  fun completeOperation(operationId: String) {
    transition {
      if (this.operationId != operationId) return@transition
      if (operationKind?.isDropIn == true) {
        dropInLauncher?.clearResult()
      }
      settleRequestLocked(invokeFallback = true)
      presenter?.dispose()
      presenter = null
      // The host adapter resolves the bottom sheet from the still-active operation identity.
      if (fragmentPresentations.containsKey(operationId)) {
        dependencies?.hostLauncherAdapter?.releaseCheckoutHost()
      }
      redirectControllers.remove(operationId)
      this.operationId = null
      operationKind = null
      fragmentPresentations.remove(operationId)
    }
  }

  @MainThread
  fun invalidate() {
    transition { invalidateLocked() }
  }

  /** React context and activity loss share the same native-owned terminal cleanup. */
  @MainThread
  fun hostDidDisappear() {
    transition { invalidateLocked() }
  }

  /**
   * Runtime destruction is conditional on exact generated-module ownership. This is separate
   * from checkout-handle invalidation so a stale module instance cannot clean a replacement.
   */
  @MainThread
  fun hostDidDisappear(ownerId: String) {
    transition {
      if (lifecycleOwnerId == ownerId) {
        invalidateLocked()
      }
    }
  }

  /**
   * Returns the registry controller for [paymentMethodId], creating it eagerly on first use.
   * Creation is idempotent per payment method id, so availability checks and controller creation
   * share one native controller. [create] returns null when the SDK cannot build a component for
   * the exact instance; that result is remembered for the lifetime of the checkout.
   */
  @MainThread
  fun registerController(
    checkoutId: String,
    paymentMethodId: String,
    create: () -> RegisteredController?,
  ): ControllerRegistration? =
    transition {
      if (this.checkoutId != checkoutId || isDisposing) throw StaleCheckoutException()
      controllerIdsByPaymentMethodId[paymentMethodId]?.let { controllerId ->
        controllers[controllerId]?.let { entry ->
          return@transition ControllerRegistration(controllerId, entry.controller.requiresUserInteraction)
        }
      }
      if (paymentMethodId in unavailablePaymentMethodIds) return@transition null
      // A throwing factory means the instance is not creatable; caching it keeps an availability
      // probe from ever re-entering the SDK or escaping the bridge runnable.
      val created =
        try {
          create()
        } catch (_: Exception) {
          null
        }
      if (this.checkoutId != checkoutId || isDisposing) {
        created?.dispose()
        throw StaleCheckoutException()
      }
      if (created == null) {
        unavailablePaymentMethodIds += paymentMethodId
        return@transition null
      }
      val controllerId = nextId(CoordinatorIdentityKind.CONTROLLER)
      controllers[controllerId] = ControllerEntry(checkoutId, created)
      controllerIdsByPaymentMethodId[paymentMethodId] = controllerId
      ControllerRegistration(controllerId, created.requiresUserInteraction)
    }

  /**
   * Binds a mounted view to an existing registry controller. A controller renders in at most one
   * live view; a second simultaneous bind rejects, while re-binding after [unbindControllerView]
   * is allowed. Binding never creates a controller.
   */
  @MainThread
  fun bindControllerView(
    checkoutId: String,
    controllerId: String,
    binding: ControllerViewBinding,
  ): RegisteredController =
    transition {
      if (this.checkoutId != checkoutId || isDisposing) throw StaleCheckoutException()
      val entry = controllers[controllerId]?.takeIf { it.checkoutId == checkoutId } ?: throw UnknownControllerException()
      val current = entry.view
      if (current != null && current !== binding) throw ControllerAlreadyBoundException()
      entry.view = binding
      entry.controller
    }

  /** Unmount detaches only the exact binding it created; the controller stays registered. */
  @MainThread
  fun unbindControllerView(
    controllerId: String,
    binding: ControllerViewBinding,
  ) {
    transition {
      val entry = controllers[controllerId] ?: return@transition
      if (entry.view === binding) {
        entry.view = null
      }
    }
  }

  @MainThread
  fun controllerCount(): Int = transition { controllers.size }

  @MainThread
  fun registerRedirectController(
    controller: CheckoutController,
    ownerId: String,
  ) {
    transition {
      check(operationId == ownerId) { "Stale redirect owner" }
      redirectControllers[ownerId] = controller
    }
  }

  @MainThread
  fun unregisterRedirectController(controller: CheckoutController) {
    transition {
      redirectControllers.entries.removeAll { it.value === controller }
    }
  }

  @MainThread
  fun handleReturn(intent: android.content.Intent): Boolean =
    transition {
      val owner = operationId ?: return@transition false
      val controller = redirectControllers[owner] ?: return@transition false
      controller.handleReturn(intent)
      true
    }

  /**
   * Fragment state is coordinator-owned and keyed only by the operation identity. A recreated
   * [CheckoutFragment] reads this data through these methods; it never carries a controller or
   * serialized checkout state in arguments.
   */
  @MainThread
  fun registerFragmentPresentation(
    operationId: String,
    cancellable: Boolean,
    autoSubmit: Boolean,
    onCancelled: () -> Unit,
  ) {
    transition {
      check(this.operationId == operationId && presenter != null) { "Stale operation" }
      fragmentPresentations[operationId] = FragmentPresentation(cancellable, autoSubmit, onCancelled)
    }
  }

  @MainThread
  fun fragmentController(operationId: String): CheckoutController? =
    transition {
      if (this.operationId == operationId) presenter?.controller() else null
    }

  /**
   * Controllers are scoped to their Activity. A system-restored fragment must not resume a
   * controller from the destroyed host, so terminalize the whole checkout before it can render.
   */
  @MainThread
  fun invalidateRestoredFragment(operationId: String): Boolean =
    transition {
      // DialogFragment.onDismiss can run while the old Activity is being destroyed, before the
      // FragmentManager restores this identifier-only fragment. The active operation is the
      // durable ownership marker; presentation metadata is intentionally transient.
      if (this.operationId != operationId) {
        false
      } else {
        invalidateLocked()
        true
      }
    }

  @MainThread
  fun fragmentCancellable(operationId: String): Boolean = transition { fragmentPresentations[operationId]?.cancellable == true }

  @MainThread
  fun fragmentAutoSubmit(operationId: String): Boolean = transition { fragmentPresentations[operationId]?.autoSubmit == true }

  @MainThread
  fun fragmentCancelled(operationId: String) {
    val callback =
      transition {
        if (this.operationId != operationId || isDisposing) {
          null
        } else {
          fragmentPresentations[operationId]?.onCancelled
        }
      }
    callback?.invoke()
  }

  @MainThread
  fun fragmentDismissed(operationId: String) {
    transition { fragmentPresentations.remove(operationId) }
  }

  @MainThread
  fun emitTerminal(
    checkoutId: String,
    kind: String,
    payloadJson: String? = null,
  ) {
    transition {
      if (this.checkoutId == checkoutId) {
        emit(CoordinatorEvent.Terminal(checkoutId, kind, payloadJson))
      }
    }
  }

  private fun replaceLocked(create: () -> CoordinatorCheckout): String {
    check(!isSettingUp) { "Checkout setup is already active" }
    invalidateLocked()
    isSettingUp = true
    setupGeneration += 1
    val generation = setupGeneration
    val createdCheckout =
      try {
        create()
      } catch (exception: Exception) {
        if (setupGeneration == generation) {
          isSettingUp = false
        }
        throw exception
      }

    if (!isSettingUp || setupGeneration != generation) {
      createdCheckout.dispose()
      throw IllegalStateException("Checkout setup became stale")
    }

    val createdCheckoutId = nextId(CoordinatorIdentityKind.CHECKOUT)
    checkout = createdCheckout
    checkoutId = createdCheckoutId
    checkoutState = (createdCheckout as? CheckoutStateOwner)?.checkoutState
    isSettingUp = false
    emit(CoordinatorEvent.Activated(createdCheckoutId))
    return createdCheckoutId
  }

  private fun timeout(candidate: CoordinatorRequest) {
    transition {
      if (request != candidate) return@transition
      emit(CoordinatorEvent.StaleRequest(candidate))
      settleRequestLocked(invokeFallback = true)
    }
  }

  private fun invalidateLocked() {
    if (isDisposing) return
    isDisposing = true
    setupGeneration += 1
    isSettingUp = false
    lifecycleOwnerId = null
    settleRequestLocked(invokeFallback = true)
    val currentCheckoutId = checkoutId
    try {
      presenter?.dispose()
      presenter = null
      if (operationKind?.isDropIn == true) {
        dropInLauncher?.clearResult()
      }
      // Request fallbacks above resume pending SDK callbacks before their controllers go away.
      val ownedControllers = controllers.values.toList()
      controllers.clear()
      controllerIdsByPaymentMethodId.clear()
      unavailablePaymentMethodIds.clear()
      ownedControllers.forEach { entry ->
        entry.view?.detach()
        entry.view = null
        entry.controller.dispose()
      }
      redirectControllers.clear()
      fragmentPresentations.clear()

      checkout?.dispose()
      checkout = null
      // The host adapter reads the current operation to detach coordinator-owned presentation.
      // Keep it available until the checkout and presenters have been released.
      currentCheckoutId?.let { dependencies?.hostLauncherAdapter?.releaseCheckoutHost() }
      checkoutId = null
      checkoutState = null
      operationId = null
      operationKind = null
      currentCheckoutId?.let { emit(CoordinatorEvent.CleanedUp(it)) }
    } finally {
      isDisposing = false
    }
  }

  /**
   * Settles only [expectedRequest] when supplied, so a failed publication or stale callback cannot
   * clear a request that replaced it while an event sink was running.
   */
  private fun settleRequestLocked(
    expectedRequest: CoordinatorRequest? = null,
    invokeFallback: Boolean = false,
  ) {
    if (expectedRequest != null && request != expectedRequest) return
    requestCancellation?.cancel()
    requestCancellation = null
    request = null
    requestEventKind = null
    requestResponse = null
    val fallback = requestCancellationFallback
    requestCancellationFallback = null
    if (invokeFallback) {
      fallback?.invoke()
    }
  }

  private fun beginOperationLocked(
    kind: OperationKind,
    createPresenter: ((String) -> CoordinatorPresenter)? = null,
  ): String {
    val activeCheckoutId = checkNotNull(checkoutId) { "No active checkout" }
    check(operationId == null) {
      emit(CoordinatorEvent.OperationBusy)
      "Operation is already active"
    }
    val createdOperationId = nextId(CoordinatorIdentityKind.OPERATION)
    val createdPresenter =
      createPresenter?.invoke(createdOperationId)
        ?: checkNotNull(dependencies) { "CheckoutCoordinator requires configured dependencies" }
          .presenterFactory
          .create(
            CoordinatorPresentation(
              checkoutId = activeCheckoutId,
              operationId = createdOperationId,
              isDropIn = kind.isDropIn,
            ),
          )
    presenter = createdPresenter
    operationId = createdOperationId
    operationKind = kind
    return createdOperationId
  }

  private fun finishDropIn(
    expectedOperationId: String,
    expectedPresenter: CoordinatorDropInPresenter,
    result: CoordinatorDropInResult,
  ) {
    val matched =
      transition {
        operationId == expectedOperationId &&
          operationKind?.isDropIn == true &&
          presenter === expectedPresenter
      }
    if (!matched) return
    expectedPresenter.onDropInResult(result)
    invalidate()
  }

  private inline fun <T> transition(block: () -> T): T {
    check(Looper.myLooper() == Looper.getMainLooper()) {
      "CheckoutCoordinator transitions must run on the main thread"
    }
    return block()
  }

  private fun nextId(kind: CoordinatorIdentityKind): String = dependencies?.identityGenerator?.next(kind) ?: UUID.randomUUID().toString()

  private fun emit(event: CoordinatorEvent) {
    dependencies?.eventSink?.emit(event)
  }
}

/** Production checkout candidates expose coordinator-owned state only after commit. */
internal interface CheckoutStateOwner : CoordinatorCheckout {
  val checkoutState: CheckoutState
}
