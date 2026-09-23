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

  private val dependencies: CheckoutCoordinatorDependencies
    get() = checkNotNull(configuredDependencies) { "CheckoutCoordinator dependencies are not configured" }

  /** Legacy module paths delegate state and registries here until their commands migrate. */
  var checkoutState: CheckoutState? = null
  private val managers = mutableMapOf<String, ComponentManager>()
  private val consumers = mutableMapOf<String, ComponentContract>()
  private val redirectControllers = mutableSetOf<CheckoutController>()

  private var checkout: CoordinatorCheckout? = null
  private var checkoutId: String? = null
  private var presenter: CoordinatorPresenter? = null
  private var operationId: String? = null
  private var request: CoordinatorRequest? = null
  private var requestCancellation: CoordinatorCancellation? = null

  @MainThread
  fun activeCheckoutId(): String? = transition { checkoutId }

  /** Replacement disposes before creation; a factory exception leaves the owner idle. */
  @MainThread
  fun setup(): String =
    transition {
      invalidateLocked()
      val createdCheckout = dependencies.checkoutFactory.create()
      val createdCheckoutId = dependencies.identityGenerator.next(CoordinatorIdentityKind.CHECKOUT)
      checkout = createdCheckout
      checkoutId = createdCheckoutId
      dependencies.eventSink.emit(CoordinatorEvent.Activated(createdCheckoutId))
      createdCheckoutId
    }

  @MainThread
  fun beginOperation(): String =
    transition {
      check(checkoutId != null) { "No active checkout" }
      check(operationId == null) {
        dependencies.eventSink.emit(CoordinatorEvent.OperationBusy)
        "Operation is already active"
      }
      val createdOperationId = dependencies.identityGenerator.next(CoordinatorIdentityKind.OPERATION)
      presenter = dependencies.presenterFactory.create()
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
          requestId = dependencies.identityGenerator.next(CoordinatorIdentityKind.REQUEST),
          kind = kind,
        )
      request = createdRequest
      requestCancellation =
        dependencies.scheduler.schedule(timeoutMillis) {
          timeout(createdRequest)
        }
      dependencies.eventSink.emit(CoordinatorEvent.Request(createdRequest))
      createdRequest
    }

  /** Returns false for stale, duplicate, wrong-kind, or late responses. */
  @MainThread
  fun resolve(candidate: CoordinatorRequest): Boolean =
    transition {
      if (request != candidate) {
        dependencies.eventSink.emit(CoordinatorEvent.StaleRequest(candidate))
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

  @MainThread
  fun registerManager(
    id: String,
    manager: ComponentManager,
  ) {
    transition { managers[id] = manager }
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
      managers.values.forEach { it.dispose() }
      managers.clear()
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
  fun registerRedirectController(controller: CheckoutController) {
    transition { redirectControllers += controller }
  }

  @MainThread
  fun unregisterRedirectController(controller: CheckoutController) {
    transition { redirectControllers -= controller }
  }

  @MainThread
  fun handleReturn(intent: android.content.Intent): Boolean =
    transition {
      if (redirectControllers.isEmpty()) return@transition false
      redirectControllers.forEach { it.handleReturn(intent) }
      true
    }

  private fun timeout(candidate: CoordinatorRequest) {
    transition {
      if (request != candidate) return@transition
      dependencies.eventSink.emit(CoordinatorEvent.StaleRequest(candidate))
      settleRequestLocked()
    }
  }

  private fun invalidateLocked() {
    settleRequestLocked()
    presenter?.dispose()
    presenter = null
    operationId = null

    val currentCheckoutId = checkoutId ?: return
    checkout?.dispose()
    checkout = null
    checkoutId = null
    dependencies.hostLauncherAdapter.releaseCheckoutHost()
    dependencies.eventSink.emit(CoordinatorEvent.CleanedUp(currentCheckoutId))
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
}
