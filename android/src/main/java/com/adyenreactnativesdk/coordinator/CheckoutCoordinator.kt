/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import android.os.Looper
import android.util.Log
import androidx.annotation.MainThread
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentManager
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

internal interface CoordinatorPresenter {
  suspend fun createController(
    context: CheckoutContext,
    target: CheckoutTarget,
  ): CheckoutController?

  fun handleAction(action: Action)

  fun complete(resultCode: String)

  fun retry(message: String?)

  /** The current controller is consulted by an identifier-only fragment after recreation. */
  fun controller(): CheckoutController? = null

  fun dispose()
}

/** Private identity supplied to presenter factories, never exposed through the public bridge. */
internal data class CoordinatorPresentation(
  val checkoutId: String,
  val operationId: String?,
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
    /** The sole process-scoped owner for legacy and coordinator lifecycle state. */
    val shared = CheckoutCoordinator()
    private const val TAG = "CheckoutCoordinator"
  }

  /** Legacy module paths delegate checkout state here until their commands migrate. */
  var checkoutState: CheckoutState? = null
  private var runtimeDependencies: CheckoutCoordinatorDependencies? = null
  private val dependencies: CheckoutCoordinatorDependencies?
    get() = configuredDependencies ?: runtimeDependencies
  private val passivePresenters = mutableMapOf<String, PassivePresenter>()
  private val passivePresenterIdsByTarget = mutableMapOf<CheckoutTarget, String>()
  private val redirectControllers = mutableMapOf<String, CheckoutController>()

  private var checkout: CoordinatorCheckout? = null
  private var checkoutId: String? = null
  private var presenter: CoordinatorPresenter? = null
  private var operationId: String? = null
  private var operationKind: OperationKind? = null
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

  private data class PassivePresenter(
    val checkoutId: String,
    val target: CheckoutTarget,
    val presenter: CoordinatorPresenter,
  )

  private data class FragmentPresentation(
    val cancellable: Boolean,
    val autoSubmit: Boolean,
    val onCancelled: () -> Unit,
  )

  private enum class OperationKind {
    EXPLICIT,
    EMBEDDED,
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

  @MainThread
  fun beginOperation(): String =
    transition {
      val activeCheckoutId = checkNotNull(checkoutId) { "No active checkout" }
      check(operationId == null) {
        emit(CoordinatorEvent.OperationBusy)
        "Operation is already active"
      }
      val createdOperationId = nextId(CoordinatorIdentityKind.OPERATION)
      val createdPresenter =
        checkNotNull(dependencies) { "CheckoutCoordinator requires configured dependencies" }
          .presenterFactory
          .create(
            CoordinatorPresentation(
              checkoutId = activeCheckoutId,
              operationId = createdOperationId,
            ),
          )
      presenter = createdPresenter
      operationId = createdOperationId
      operationKind = OperationKind.EXPLICIT
      createdOperationId
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

  /**
   * Creates a coordinator-owned temporary presenter for a query and always releases it before
   * returning. Queries do not acquire the interactive operation slot.
   */
  suspend fun <T> withQueryPresenter(block: suspend (CoordinatorPresenter) -> T): T {
    val queryPresenter =
      transition {
        val activeCheckoutId = checkNotNull(checkoutId) { "No active checkout" }
        checkNotNull(dependencies) { "CheckoutCoordinator requires configured dependencies" }
          .presenterFactory
          .create(CoordinatorPresentation(checkoutId = activeCheckoutId, operationId = null))
      }
    return try {
      block(queryPresenter)
    } finally {
      transition { queryPresenter.dispose() }
    }
  }

  @MainThread
  fun presenter(operationId: String): CoordinatorPresenter? =
    transition {
      if (this.operationId == operationId) presenter else null
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

  @MainThread
  fun completeOperation(operationId: String) {
    transition {
      if (this.operationId != operationId) return@transition
      settleRequestLocked(invokeFallback = true)
      presenter?.dispose()
      presenter = null
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
   * Registers a mounted Fabric view without acquiring the interactive operation slot. The
   * registration is bound to opaque identities and one canonical SDK-supported target. Regular
   * targets are exact types and stored targets are exact IDs. TODO: include subtype/funding
   * source only when a published component-creation API supports that precision.
   */
  @MainThread
  fun registerPassivePresenter(
    checkoutId: String,
    presenterId: String,
    target: CheckoutTarget,
    presenter: CoordinatorPresenter,
  ) {
    transition {
      check(this.checkoutId == checkoutId) { "Stale checkout" }
      val existing = passivePresenters[presenterId]
      check(
        existing == null ||
          (existing.checkoutId == checkoutId && existing.target == target && existing.presenter === presenter),
      ) {
        "Presenter identity collision"
      }
      if (existing != null) return@transition
      check(passivePresenterIdsByTarget[target] == null) { "Duplicate embedded checkout target" }
      passivePresenters[presenterId] = PassivePresenter(checkoutId, target, presenter)
      passivePresenterIdsByTarget[target] = presenterId
    }
  }

  /**
   * Delayed recycle/unmount only removes the exact registration it created. A newly mounted view
   * with a reused Fabric token is therefore left intact.
   */
  @MainThread
  fun unregisterPassivePresenter(
    checkoutId: String,
    presenterId: String,
    presenter: CoordinatorPresenter,
  ) {
    transition {
      val existing = passivePresenters[presenterId] ?: return@transition
      if (existing.checkoutId == checkoutId && existing.presenter === presenter) {
        passivePresenters.remove(presenterId)
        if (passivePresenterIdsByTarget[existing.target] == presenterId) {
          passivePresenterIdsByTarget.remove(existing.target)
        }
        redirectControllers.remove(presenterId)
      }
    }
  }

  @MainThread
  fun isPassivePresenterActive(
    checkoutId: String,
    presenterId: String,
    presenter: CoordinatorPresenter,
  ): Boolean =
    transition {
      val existing = passivePresenters[presenterId]
      this.checkoutId == checkoutId && existing?.checkoutId == checkoutId && existing.presenter === presenter
    }

  @MainThread
  fun passivePresenterCount(): Int = transition { passivePresenters.size }

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
      if (this.operationId != operationId || fragmentPresentations[operationId] == null) {
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
      val ownedPassivePresenters = passivePresenters.values.map { it.presenter }
      passivePresenters.clear()
      passivePresenterIdsByTarget.clear()
      ownedPassivePresenters.forEach { it.dispose() }
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

/** Production checkout candidates expose coordinator-owned legacy state only after commit. */
internal interface CheckoutStateOwner : CoordinatorCheckout {
  val checkoutState: CheckoutState
}
