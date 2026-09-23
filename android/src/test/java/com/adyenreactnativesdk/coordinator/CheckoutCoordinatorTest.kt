/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutCoordinatorTest {
  @Test
  fun `replacement disposes before the next checkout is created`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()

    coordinator.setup()
    coordinator.setup()

    assertEquals(listOf("create-1", "dispose-1", "host-release", "create-2"), fixture.log)
    assertEquals("checkout-2", coordinator.activeCheckoutId())
  }

  @Test
  fun `failed replacement leaves the coordinator idle`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    fixture.factory.shouldFail = true

    try {
      coordinator.setup()
      fail("Expected checkout factory failure")
    } catch (_: IllegalStateException) {
      assertNull(coordinator.activeCheckoutId())
      assertEquals(listOf("create-1", "dispose-1", "host-release", "create-failed"), fixture.log)
    }
  }

  @Test
  fun `invalidation during suspended setup disposes the uncommitted candidate`() =
    runBlocking {
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      val factoryStarted = CompletableDeferred<Unit>()
      val allowFactoryToFinish = CompletableDeferred<Unit>()

      val setup =
        async(start = CoroutineStart.UNDISPATCHED) {
          runCatching {
            coordinator.setupAsync {
              factoryStarted.complete(Unit)
              allowFactoryToFinish.await()
              fixture.factory.create()
            }
          }
        }
      factoryStarted.await()
      coordinator.invalidate()
      allowFactoryToFinish.complete(Unit)

      assertTrue(setup.await().isFailure)
      assertNull(coordinator.activeCheckoutId())
      assertEquals(
        1,
        fixture.factory.checkouts
          .single()
          .disposeCount,
      )
    }

  @Test
  fun `contention and stale requests cannot settle active work`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    try {
      coordinator.beginOperation()
      fail("Expected operation contention")
    } catch (_: IllegalStateException) {
      // Expected.
    }
    val wrongKind = request.copy(kind = CoordinatorRequestKind.SESSION_BEFORE_SUBMIT)
    assertFalse(coordinator.resolve(wrongKind))
    assertTrue(coordinator.resolve(request))
    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.events.filterIsInstance<CoordinatorEvent.OperationBusy>().size)
  }

  @Test
  fun `request broker requires checkout operation request and kind to match`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    assertFalse(coordinator.resolve(request.copy(checkoutId = "other-checkout")))
    assertFalse(coordinator.resolve(request.copy(operationId = "other-operation")))
    assertFalse(coordinator.resolve(request.copy(requestId = "other-request")))
    assertFalse(coordinator.resolve(request.copy(kind = CoordinatorRequestKind.SESSION_BEFORE_SUBMIT)))
    assertTrue(coordinator.resolve(request))
    assertFalse(coordinator.resolve(request))
  }

  @Test
  fun `timeout and invalidation cancel every owned resource`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.UNSUPPORTED_CAPABILITY, 100)

    fixture.scheduler.fireLast()
    assertFalse(coordinator.resolve(request))
    coordinator.invalidate()
    coordinator.invalidate()

    assertEquals(1, fixture.presenter.disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
    assertTrue(fixture.scheduler.cancellations.all { it.cancelled })
  }

  @Test
  fun `host loss makes the operation request stale and releases the flow once`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    coordinator.hostDidDisappear()
    coordinator.hostDidDisappear()

    assertNull(coordinator.activeCheckoutId())
    assertNull(coordinator.activeOperationId())
    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.presenter.disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
  }

  @Test
  fun `replacement makes the old identity stale before host loss`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val oldCheckoutId = coordinator.setup()
    val replacementId = coordinator.setup()

    assertFalse(coordinator.isActive(oldCheckoutId))
    assertTrue(coordinator.isActive(replacementId))
    coordinator.hostDidDisappear()

    assertNull(coordinator.activeCheckoutId())
    assertEquals(listOf(1, 1), fixture.factory.checkouts.map { it.disposeCount })
  }

  @Test
  fun `fresh operations receive distinct identities after cleanup`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val firstOperation = coordinator.beginOperation()
    coordinator.completeOperation(firstOperation)
    val secondOperation = coordinator.beginOperation()

    assertEquals("operation-1", firstOperation)
    assertEquals("operation-2", secondOperation)
  }

  @Test
  fun `discarded events do not retain timeout cleanup`() {
    val fixture = Fixture()
    val coordinator =
      fixture.coordinator(
        eventSink =
          object : CheckoutEventSink {
            override fun emit(event: CoordinatorEvent) = Unit
          },
      )
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    fixture.scheduler.fireLast()
    coordinator.invalidate()

    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.presenter.disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
  }

  private class Fixture {
    val log = mutableListOf<String>()
    val factory = Factory(log)
    val presenter = Presenter()
    val events = mutableListOf<CoordinatorEvent>()
    val scheduler = Scheduler()
    val host = Host(log)
    private val identities = Identities()

    fun coordinator(
      eventSink: CheckoutEventSink =
        object : CheckoutEventSink {
          override fun emit(event: CoordinatorEvent) {
            events += event
          }
        },
    ): CheckoutCoordinator =
      CheckoutCoordinator(
        CheckoutCoordinatorDependencies(
          checkoutFactory = factory,
          presenterFactory =
            object : PresenterFactory {
              override fun create(): CoordinatorPresenter = presenter
            },
          eventSink = eventSink,
          identityGenerator = identities,
          scheduler = scheduler,
          hostLauncherAdapter = host,
        ),
      )
  }

  private class Factory(
    private val log: MutableList<String>,
  ) : CheckoutFactory {
    var shouldFail = false
    val checkouts = mutableListOf<Checkout>()

    override fun create(): CoordinatorCheckout {
      check(!shouldFail) {
        log += "create-failed"
        "Factory failed"
      }
      return Checkout(log, checkouts.size + 1).also { checkouts += it }
    }
  }

  private class Checkout(
    private val log: MutableList<String>,
    private val number: Int,
  ) : CoordinatorCheckout {
    var disposeCount = 0

    init {
      log += "create-$number"
    }

    override fun dispose() {
      disposeCount += 1
      log += "dispose-$number"
    }
  }

  private class Presenter : CoordinatorPresenter {
    var disposeCount = 0

    override fun dispose() {
      disposeCount += 1
    }
  }

  private class Identities : CheckoutIdentityGenerator {
    private val nextByKind = mutableMapOf<CoordinatorIdentityKind, Int>()

    override fun next(kind: CoordinatorIdentityKind): String {
      val next = (nextByKind[kind] ?: 0) + 1
      nextByKind[kind] = next
      return when (kind) {
        CoordinatorIdentityKind.CHECKOUT -> "checkout-$next"
        CoordinatorIdentityKind.OPERATION -> "operation-$next"
        CoordinatorIdentityKind.REQUEST -> "request-$next"
      }
    }
  }

  private class Scheduler : CheckoutScheduler {
    val cancellations = mutableListOf<Cancellation>()
    private val actions = mutableListOf<() -> Unit>()

    override fun schedule(
      delayMillis: Long,
      action: () -> Unit,
    ): CoordinatorCancellation {
      val cancellation = Cancellation()
      cancellations += cancellation
      actions += { if (!cancellation.cancelled) action() }
      return cancellation
    }

    fun fireLast() {
      actions.last().invoke()
    }
  }

  private class Cancellation : CoordinatorCancellation {
    var cancelled = false

    override fun cancel() {
      cancelled = true
    }
  }

  private class Host(
    private val log: MutableList<String>,
  ) : CheckoutHostLauncherAdapter {
    var releaseCount = 0

    override fun releaseCheckoutHost() {
      releaseCount += 1
      log += "host-release"
    }
  }
}
