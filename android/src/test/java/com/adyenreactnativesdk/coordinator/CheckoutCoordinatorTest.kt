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
  fun `stale module teardown cannot invalidate its replacement`() =
    runBlocking {
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      coordinator.setupAsync(ownerId = "module-a") { fixture.factory.create() }
      val replacementId =
        coordinator.setupAsync(ownerId = "module-b") {
          fixture.factory.create()
        }

      coordinator.hostDidDisappear("module-a")

      assertTrue(coordinator.isActive(replacementId))
      assertEquals(listOf(1, 0), fixture.factory.checkouts.map { it.disposeCount })
      coordinator.hostDidDisappear("module-b")
      coordinator.hostDidDisappear("module-b")
      assertNull(coordinator.activeCheckoutId())
      assertEquals(listOf(1, 1), fixture.factory.checkouts.map { it.disposeCount })
      assertEquals(2, fixture.host.releaseCount)
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
  fun `headless operation creates one configured presenter and disposes it through the coordinator`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()

    val operationId = coordinator.beginOperation()

    assertEquals(1, fixture.presenterFactory.createCount)
    assertEquals(
      CoordinatorPresentation(checkoutId = "checkout-1", operationId = operationId),
      fixture.presenterFactory.presentations.single(),
    )
    coordinator.completeOperation(operationId)

    assertEquals(1, fixture.presenter.disposeCount)
  }

  @Test
  fun `query presenter is coordinator owned and released without acquiring an operation`() =
    runBlocking {
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      coordinator.setup()

      val result =
        coordinator.withQueryPresenter {
          assertNull(coordinator.activeOperationId())
          "query-result"
        }

      assertEquals("query-result", result)
      assertEquals(1, fixture.presenterFactory.createCount)
      assertEquals(
        CoordinatorPresentation(checkoutId = "checkout-1", operationId = null),
        fixture.presenterFactory.presentations.single(),
      )
      assertEquals(1, fixture.presenter.disposeCount)
    }

  @Test
  fun `configured event sink receives a generated request once`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()

    val request =
      coordinator.beginRequest(
        operationId = operationId,
        kind = CoordinatorRequestKind.ADVANCED_SUBMIT,
        timeoutMillis = 100,
        eventKind = "advancedSubmit",
        payloadJson = """{"amount":1}""",
      )

    val event = fixture.events.filterIsInstance<CoordinatorEvent.Request>().single()
    assertEquals(request, event.request)
    assertEquals("advancedSubmit", event.eventKind)
    assertEquals("""{"amount":1}""", event.payloadJson)
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
    val presenterFactory = PresenterFactory(presenter)
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
          presenterFactory = presenterFactory,
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

    override suspend fun createController(
      context: com.adyen.checkout.core.common.CheckoutContext,
      target: com.adyen.checkout.core.components.CheckoutTarget,
    ) = null

    override fun handleAction(action: com.adyen.checkout.core.action.data.Action) = Unit

    override fun complete(resultCode: String) = Unit

    override fun retry(message: String?) = Unit

    override fun dispose() {
      disposeCount += 1
    }
  }

  private class PresenterFactory(
    private val presenter: Presenter,
  ) : com.adyenreactnativesdk.coordinator.PresenterFactory {
    var createCount = 0
    val presentations = mutableListOf<CoordinatorPresentation>()

    override fun create(presentation: CoordinatorPresentation): CoordinatorPresenter {
      createCount += 1
      presentations += presentation
      return presenter
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
