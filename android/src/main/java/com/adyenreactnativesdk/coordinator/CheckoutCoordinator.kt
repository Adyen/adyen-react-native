/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import android.os.Looper
import androidx.annotation.MainThread
import com.adyen.checkout.core.components.CheckoutController
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.react.ComponentContract
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
  fun create(): CoordinatorPresenter
}

internal interface CoordinatorPresenter {
  fun dispose()
}

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
  ) : CoordinatorEvent

  data class StaleRequest(
    val request: CoordinatorRequest,
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
  }

  /** Legacy module paths delegate state and registries here until their commands migrate. */
  var checkoutState: CheckoutState? = null
  private val managers = mutableMapOf<String, ComponentManager>()
  private val consumers = mutableMapOf<String, ComponentContract>()
  private val redirectControllers = mutableMapOf<String, CheckoutController>()

  private var checkout: CoordinatorCheckout? = null
  private var checkoutId: String? = null
  private var presenter: CoordinatorPresenter? = null
  private var operationId: String? = null
  private var request: CoordinatorRequest? = null
  private var requestCancellation: CoordinatorCancellation? = null
  private var isSettingUp = false
  private var setupGeneration = 0

  @MainThread
  fun activeCheckoutId(): String? = transition { checkoutId }

  @MainThread
  fun activeOperationId(): String? = transition { operationId }

  @MainThread
  fun isActive(checkoutId: String): Boolean = transition { this.checkoutId == checkoutId }

  /** Replacement disposes before creation; a factory exception leaves the owner idle. */
  @MainThread
  fun setup(): String =
    transition {
      val dependencies =
        checkNotNull(configuredDependencies) {
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
  suspend fun setupAsync(create: suspend () -> CoordinatorCheckout): String {
    transition {
      check(!isSettingUp) { "Checkout setup is already active" }
      invalidateLocked()
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
      check(checkoutId != null) { "No active checkout" }
      check(operationId == null) {
        emit(CoordinatorEvent.OperationBusy)
        "Operation is already active"
      }
      val createdOperationId = nextId(CoordinatorIdentityKind.OPERATION)
      presenter =
        configuredDependencies?.presenterFactory?.create()
          ?: NoopCoordinatorPresenter
      operationId = createdOperationId
      createdOperationId
    }

  @MainThread
  fun beginRequest(
    operationId: String,
    kind: CoordinatorRequestKind,
    timeoutMillis: Long,
  ): CoordinatorRequest =
    transition {
      val currentCheckoutId = checkNotNull(checkoutId) { "No active checkout" }
      check(this.operationId == operationId) { "Stale operation" }
      settleRequestLocked()
      val createdRequest =
        CoordinatorRequest(
          checkoutId = currentCheckoutId,
          operationId = operationId,
          requestId = nextId(CoordinatorIdentityKind.REQUEST),
          kind = kind,
        )
      request = createdRequest
      requestCancellation =
        configuredDependencies?.scheduler?.schedule(timeoutMillis) {
          timeout(createdRequest)
        }
      emit(CoordinatorEvent.Request(createdRequest))
      createdRequest
    }

  /** Returns false for stale, duplicate, wrong-kind, or late responses. */
  @MainThread
  fun resolve(candidate: CoordinatorRequest): Boolean =
    transition {
      if (request != candidate) {
        emit(CoordinatorEvent.StaleRequest(candidate))
        false
      } else {
        settleRequestLocked()
        true
      }
    }

  @MainThread
  fun completeOperation(operationId: String) {
    transition {
      if (this.operationId != operationId) return@transition
      settleRequestLocked()
      presenter?.dispose()
      presenter = null
      this.operationId = null
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

  @MainThread
  fun registerManager(
    id: String,
    manager: ComponentManager,
  ) {
    transition { managers[id] = manager }
  }

  /** Presenter registrations are identities, never payment-method types. */
  @MainThread
  fun registerManager(manager: ComponentManager): String =
    transition {
      val id = nextId(CoordinatorIdentityKind.OPERATION)
      managers[id] = manager
      id
    }

  @MainThread
  fun unregisterManager(id: String) {
    transition { managers.remove(id)?.dispose() }
  }

  @MainThread
  fun manager(id: String): ComponentManager? = transition { managers[id] }

  @MainThread
  fun allManagers(): List<ComponentManager> = transition { managers.values.toList() }

  @MainThread
  fun clearManagers() {
    transition {
      clearManagersLocked()
    }
  }

  @MainThread
  fun registerConsumer(
    id: String,
    consumer: ComponentContract,
  ) {
    transition { consumers[id] = consumer }
  }

  @MainThread
  fun unregisterConsumer(id: String) {
    transition { consumers.remove(id) }
  }

  @MainThread
  fun consumer(id: String): ComponentContract? = transition { consumers[id] }

  @MainThread
  fun clearConsumers() {
    transition { consumers.clear() }
  }

  @MainThread
  fun registerRedirectController(
    controller: CheckoutController,
    operationId: String? = this.operationId,
  ) {
    transition {
      val owner = operationId ?: return@transition
      redirectControllers[owner] = controller
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
      settleRequestLocked()
    }
  }

  private fun invalidateLocked() {
    setupGeneration += 1
    isSettingUp = false
    settleRequestLocked()
    presenter?.dispose()
    presenter = null
    operationId = null
    clearManagersLocked()
    consumers.clear()
    redirectControllers.clear()

    val currentCheckoutId = checkoutId
    checkout?.dispose()
    checkout = null
    checkoutId = null
    checkoutState = null
    currentCheckoutId?.let {
      configuredDependencies?.hostLauncherAdapter?.releaseCheckoutHost()
      emit(CoordinatorEvent.CleanedUp(it))
    }
  }

  private fun settleRequestLocked() {
    requestCancellation?.cancel()
    requestCancellation = null
    request = null
  }

  private inline fun <T> transition(block: () -> T): T {
    check(Looper.myLooper() == Looper.getMainLooper()) {
      "CheckoutCoordinator transitions must run on the main thread"
    }
    return block()
  }

  private fun clearManagersLocked() {
    val ownedManagers = managers.values.toList()
    managers.clear()
    ownedManagers.forEach { it.dispose() }
  }

  private fun nextId(kind: CoordinatorIdentityKind): String =
    configuredDependencies?.identityGenerator?.next(kind) ?: UUID.randomUUID().toString()

  private fun emit(event: CoordinatorEvent) {
    configuredDependencies?.eventSink?.emit(event)
  }

  private object NoopCoordinatorPresenter : CoordinatorPresenter {
    override fun dispose() = Unit
  }
}

/** Production checkout candidates expose coordinator-owned legacy state only after commit. */
internal interface CheckoutStateOwner : CoordinatorCheckout {
  val checkoutState: CheckoutState
}
