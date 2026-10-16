/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import android.content.Intent
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.CheckoutController
import com.adyenreactnativesdk.cse.ActionOperationToken
import com.adyenreactnativesdk.cse.ActionOwnerRegistry
import com.adyenreactnativesdk.cse.AdyenCSEModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutCoordinatorTest {
  // region Setup and replacement

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
  fun `session and advanced setup failures keep candidates private and dispose once`() {
    listOf("session-validation", "session-native", "advanced-validation", "advanced-native").forEach { stage ->
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      fixture.factory.shouldFail = true

      try {
        coordinator.setup()
        fail("$stage must reject setup")
      } catch (_: IllegalStateException) {
        assertNull("$stage must not publish a checkout", coordinator.activeCheckoutId())
        assertTrue("$stage must not retain a candidate", fixture.factory.checkouts.isEmpty())
      }
    }
  }

  @Test
  fun `failed B replacement leaves A stale and C is the only event-producing checkout`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutA = coordinator.setup()
    val operationA = fixture.beginOperation(coordinator)
    val requestA = coordinator.beginRequest(operationA, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    val controllerA = fixture.controllers.single()
    fixture.factory.shouldFail = true

    try {
      coordinator.setup()
      fail("Expected B to fail")
    } catch (_: IllegalStateException) {
      assertNull(coordinator.activeCheckoutId())
      assertFalse(coordinator.resolve(requestA))
      assertEquals(1, controllerA.disposeCount)
    }

    fixture.factory.shouldFail = false
    val checkoutC = coordinator.setup()

    assertFalse(coordinator.isActive(checkoutA))
    assertTrue(coordinator.isActive(checkoutC))
    assertEquals(0, coordinator.controllerCount())
    assertEquals(listOf("checkout-1", "checkout-2"), fixture.events.filterIsInstance<CoordinatorEvent.Activated>().map { it.checkoutId })
    assertEquals(1, fixture.factory.checkouts[0].disposeCount)
    assertEquals(0, fixture.factory.checkouts[1].disposeCount)
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
      val replacementController = fixture.register(coordinator, "pm-card")

      coordinator.hostDidDisappear("module-a")

      assertTrue(coordinator.isActive(replacementId))
      assertEquals(listOf(1, 0), fixture.factory.checkouts.map { it.disposeCount })
      assertEquals(0, replacementController.controller.disposeCount)
      coordinator.hostDidDisappear("module-b")
      coordinator.hostDidDisappear("module-b")
      assertNull(coordinator.activeCheckoutId())
      assertEquals(listOf(1, 1), fixture.factory.checkouts.map { it.disposeCount })
      assertEquals(1, replacementController.controller.disposeCount)
      assertEquals(2, fixture.host.releaseCount)
    }

  // endregion

  // region Controller registry

  @Test
  fun `registry creation is idempotent per payment method id and distinct ids get distinct controllers`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    var creations = 0
    val create = {
      creations += 1
      FakeController()
    }

    val first = coordinator.registerController(checkoutId, "giftcard-a", create)
    val repeated = coordinator.registerController(checkoutId, "giftcard-a", create)
    val sameType = coordinator.registerController(checkoutId, "giftcard-b", create)

    assertEquals(first, repeated)
    assertNotEquals(first?.controllerId, sameType?.controllerId)
    assertEquals(2, creations)
    assertEquals(2, coordinator.controllerCount())
  }

  @Test
  fun `registration publishes the requiresUserInteraction resolved at creation`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()

    val interactive = coordinator.registerController(checkoutId, "card") { FakeController(requiresUserInteraction = true) }
    val headless = coordinator.registerController(checkoutId, "paypal") { FakeController(requiresUserInteraction = false) }

    assertEquals(true, interactive?.requiresUserInteraction)
    assertEquals(false, headless?.requiresUserInteraction)
  }

  @Test
  fun `non-creatable payment method is remembered unavailable without retrying creation`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    var creations = 0

    val first = coordinator.registerController(checkoutId, "giftcard-b") { null.also { creations += 1 } }
    val second = coordinator.registerController(checkoutId, "giftcard-b") { FakeController().also { creations += 1 } }

    assertNull(first)
    assertNull(second)
    assertEquals(1, creations)
    assertEquals(0, coordinator.controllerCount())
  }

  @Test
  fun `registry commands on stale checkouts or unknown controllers reject without creating`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val oldCheckoutId = coordinator.setup()
    val oldRegistration = fixture.register(coordinator, "pm-card")
    val checkoutId = coordinator.setup()
    var creations = 0

    expect<StaleCheckoutException> {
      coordinator.registerController(oldCheckoutId, "pm-card") { FakeController().also { creations += 1 } }
    }
    expect<StaleCheckoutException> { coordinator.beginControllerOperation(oldCheckoutId, oldRegistration.controllerId) }
    expect<StaleCheckoutException> { coordinator.bindControllerView(oldCheckoutId, oldRegistration.controllerId, ViewBinding()) }
    expect<UnknownControllerException> { coordinator.beginControllerOperation(checkoutId, oldRegistration.controllerId) }
    expect<UnknownControllerException> { coordinator.bindControllerView(checkoutId, "foreign-controller", ViewBinding()) }

    assertEquals(0, creations)
    assertEquals(0, coordinator.controllerCount())
    assertNull(coordinator.activeOperationId())
  }

  @Test
  fun `creation that ends the checkout disposes the late controller`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val late = FakeController()

    expect<StaleCheckoutException> {
      coordinator.registerController(checkoutId, "pm-card") {
        coordinator.invalidate()
        late
      }
    }

    assertEquals(1, late.disposeCount)
    assertEquals(0, coordinator.controllerCount())
  }

  @Test
  fun `view binding never creates and rejects a duplicate simultaneous bind while allowing rebind`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val registered = fixture.register(coordinator, "pm-card")
    val first = ViewBinding()
    val second = ViewBinding()

    assertSame(registered.controller, coordinator.bindControllerView(checkoutId, registered.controllerId, first))
    assertSame(registered.controller, coordinator.bindControllerView(checkoutId, registered.controllerId, first))
    expect<ControllerAlreadyBoundException> {
      coordinator.bindControllerView(checkoutId, registered.controllerId, second)
    }
    assertTrue(coordinator.isControllerBound(registered.controllerId))

    coordinator.unbindControllerView(registered.controllerId, second)
    assertTrue("a rejected view cannot unbind the live one", coordinator.isControllerBound(registered.controllerId))

    coordinator.unbindControllerView(registered.controllerId, first)
    assertFalse(coordinator.isControllerBound(registered.controllerId))
    assertSame(registered.controller, coordinator.bindControllerView(checkoutId, registered.controllerId, second))

    assertEquals(1, coordinator.controllerCount())
    assertEquals(1, fixture.creations)
    assertEquals(0, registered.controller.disposeCount)
    assertEquals(0, first.detachCount + second.detachCount)
  }

  @Test
  fun `every teardown path settles requests and then disposes each registered controller exactly once`() {
    val causes =
      listOf<Pair<String, (CheckoutCoordinator, Fixture, String) -> Unit>>(
        "invalidation" to { coordinator, _, _ -> coordinator.invalidate() },
        "replacement" to { coordinator, _, _ -> coordinator.setup() },
        "host-loss" to { coordinator, _, _ -> coordinator.hostDidDisappear() },
        "terminal" to { coordinator, _, checkoutId ->
          coordinator.emitTerminal(checkoutId, "completion", """{"resultCode":"Authorised"}""")
          coordinator.invalidate()
        },
        "restored-fragment" to { coordinator, _, _ ->
          coordinator.invalidateRestoredFragment(checkNotNull(coordinator.activeOperationId()))
        },
      )

    causes.forEach { (cause, trigger) ->
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      val checkoutId = coordinator.setup()
      val card = fixture.register(coordinator, "pm-card", name = "card")
      val paypal = fixture.register(coordinator, "pm-paypal", name = "paypal")
      val view = ViewBinding(fixture.log)
      coordinator.bindControllerView(checkoutId, card.controllerId, view)
      val operationId = requireNotNull(coordinator.acquireEmbeddedOperation(checkoutId))
      val request =
        coordinator.beginRequest(
          operationId,
          CoordinatorRequestKind.ADVANCED_SUBMIT,
          100,
          cancellationFallback = { fixture.log += "fallback" },
        )
      fixture.log.clear()

      trigger(coordinator, fixture, checkoutId)
      coordinator.invalidate()

      assertEquals("$cause must dispose card once", 1, card.controller.disposeCount)
      assertEquals("$cause must dispose paypal once", 1, paypal.controller.disposeCount)
      assertEquals("$cause must detach the mounted view once", 1, view.detachCount)
      assertEquals(
        "$cause must settle the request before controller disposal",
        listOf("fallback", "detach", "dispose-card", "dispose-paypal"),
        fixture.log.filter { it == "fallback" || it == "detach" || it == "dispose-card" || it == "dispose-paypal" },
      )
      assertFalse(coordinator.resolve(request))
      assertEquals(0, coordinator.controllerCount())
      assertFalse(coordinator.isControllerBound(card.controllerId))
    }
  }

  @Test
  fun `controller disposal that re-enters invalidation cannot dispose another controller twice`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val reentrant = FakeController()
    reentrant.onDispose = { coordinator.invalidate() }
    val other = FakeController()
    coordinator.registerController(checkoutId, "pm-reentrant") { reentrant }
    coordinator.registerController(checkoutId, "pm-other") { other }

    coordinator.invalidate()

    assertEquals(1, reentrant.disposeCount)
    assertEquals(1, other.disposeCount)
    assertNull(coordinator.activeCheckoutId())
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
  }

  @Test
  fun `replacement disposes registry controllers and a stale unbind cannot detach the replacement view`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val oldCheckoutId = coordinator.setup()
    val old = fixture.register(coordinator, "pm-card")
    val oldView = ViewBinding()
    coordinator.bindControllerView(oldCheckoutId, old.controllerId, oldView)

    val checkoutId = coordinator.setup()
    val replacement = fixture.register(coordinator, "pm-card")
    val replacementView = ViewBinding()
    coordinator.bindControllerView(checkoutId, replacement.controllerId, replacementView)
    coordinator.unbindControllerView(old.controllerId, oldView)

    assertEquals(1, old.controller.disposeCount)
    assertEquals(1, oldView.detachCount)
    assertNotEquals(old.controllerId, replacement.controllerId)
    assertEquals(0, replacement.controller.disposeCount)
    assertTrue(coordinator.isControllerBound(replacement.controllerId))
    assertEquals(0, replacementView.detachCount)
  }

  // endregion

  // region Explicit controller operations

  @Test
  fun `explicit operation borrows the existing registry controller without allocating another`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val sdkController = mock<CheckoutController>()
    val registered = fixture.register(coordinator, "pm-card", FakeController(checkoutController = sdkController))

    val operationId = coordinator.beginControllerOperation(checkoutId, registered.controllerId)

    assertEquals(0, fixture.presenterFactory.createCount)
    assertEquals(1, fixture.creations)
    assertEquals(1, coordinator.controllerCount())
    assertEquals(listOf(operationId), registered.controller.boundOperations)
    assertSame(sdkController, coordinator.fragmentController(operationId))

    coordinator.completeOperation(operationId)

    assertEquals(listOf(operationId), registered.controller.releasedOperations)
    assertEquals(0, registered.controller.disposeCount)
    assertNull(coordinator.fragmentController(operationId))
    assertEquals(1, coordinator.controllerCount())
    val next = coordinator.beginControllerOperation(checkoutId, registered.controllerId)
    assertEquals(listOf(operationId, next), registered.controller.boundOperations)
  }

  @Test
  fun `explicit operation routes redirects to its controller until the operation completes`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val sdkController = mock<CheckoutController>()
    val registered = fixture.register(coordinator, "pm-ideal", FakeController(checkoutController = sdkController))
    val intent = Intent()

    val operationId = coordinator.beginControllerOperation(checkoutId, registered.controllerId)
    assertTrue(coordinator.handleReturn(intent))
    verify(sdkController).handleReturn(eq(intent))

    coordinator.completeOperation(operationId)
    assertFalse(coordinator.handleReturn(Intent()))
  }

  @Test
  fun `completing an explicit operation hides only its own bottom sheet`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val registered = fixture.register(coordinator, "pm-card")

    val sheetOperation = coordinator.beginControllerOperation(checkoutId, registered.controllerId)
    coordinator.registerFragmentPresentation(sheetOperation, cancellable = true, autoSubmit = true, onCancelled = {})
    coordinator.completeOperation(sheetOperation)
    assertEquals(1, fixture.host.releaseCount)
    assertFalse(coordinator.fragmentAutoSubmit(sheetOperation))

    val inPlaceOperation = coordinator.beginControllerOperation(checkoutId, registered.controllerId)
    coordinator.completeOperation(inPlaceOperation)
    assertEquals(1, fixture.host.releaseCount)
    assertTrue(coordinator.isActive(checkoutId))
  }

  @Test
  fun `contention and stale requests cannot settle active work`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    try {
      fixture.beginOperation(coordinator, "pm-contender")
      fail("Expected operation contention")
    } catch (_: IllegalStateException) {
      assertTrue(
        fixture.controllers
          .last()
          .boundOperations
          .isEmpty(),
      )
    }
    val wrongKind = request.copy(kind = CoordinatorRequestKind.SESSION_BEFORE_SUBMIT)
    assertFalse(coordinator.resolve(wrongKind))
    assertTrue(coordinator.resolve(request))
    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.events.filterIsInstance<CoordinatorEvent.OperationBusy>().size)
  }

  @Test
  fun `every payment surface contender is rejected without binding or queueing`() {
    val surfaces = listOf("embedded", "explicit", "drop-in")

    surfaces.forEach { owner ->
      surfaces.forEach { contender ->
        val fixture = Fixture()
        val coordinator = fixture.coordinator()
        val checkoutId = coordinator.setup()
        val launcher = DropInLauncher()
        fixture.presenterFactory.presenter = DropInPresenter()
        coordinator.registerDropInLauncher(launcher)
        val ownerController = fixture.register(coordinator, "pm-owner")
        val contenderController = fixture.register(coordinator, "pm-contender")

        fun begin(
          surface: String,
          controllerId: String,
        ): String? =
          when (surface) {
            "embedded" -> coordinator.acquireEmbeddedOperation(checkoutId)
            "explicit" -> coordinator.beginControllerOperation(checkoutId, controllerId)
            else -> coordinator.beginDropIn(mock<CheckoutContext.Sessions>())
          }

        val ownerOperation = requireNotNull(begin(owner, ownerController.controllerId))
        val ownerStarts = launcher.startCount
        val contended = runCatching { begin(contender, contenderController.controllerId) }

        assertTrue("$owner must keep the slot against $contender", contended.isFailure || contended.getOrNull() == null)
        assertEquals(ownerOperation, coordinator.activeOperationId())
        assertTrue(contenderController.controller.boundOperations.isEmpty())
        assertEquals(ownerStarts, launcher.startCount)

        if (owner == "embedded") {
          coordinator.releaseEmbeddedOperation(ownerOperation)
        } else {
          coordinator.completeOperation(ownerOperation)
        }
        assertTrue(begin(contender, contenderController.controllerId) != null)
      }
    }
  }

  @Test
  fun `fresh operations receive distinct identities after cleanup`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val firstOperation = fixture.beginOperation(coordinator)
    coordinator.completeOperation(firstOperation)
    val secondOperation = fixture.beginOperation(coordinator)

    assertEquals("operation-1", firstOperation)
    assertEquals("operation-2", secondOperation)
    assertEquals(1, fixture.controllers.size)
  }

  @Test
  fun `terminal cleanup only clears the matching operation request`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    coordinator.completeOperation("stale-operation")

    assertFalse(
      fixture.scheduler.cancellations
        .single()
        .cancelled,
    )
    assertTrue(coordinator.resolve(request))
    assertTrue(
      fixture.controllers
        .single()
        .releasedOperations
        .isEmpty(),
    )
  }

  // endregion

  // region Request broker

  @Test
  fun `every supported request kind requires its exact correlation tuple`() {
    val supportedKinds =
      listOf(
        CoordinatorRequestKind.ADVANCED_SUBMIT,
        CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS,
        CoordinatorRequestKind.SESSION_BEFORE_SUBMIT,
      )

    supportedKinds.forEach { kind ->
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      coordinator.setup()
      val operationId = fixture.beginOperation(coordinator)
      val request = coordinator.beginRequest(operationId, kind, 100)

      assertFalse(coordinator.resolve(request.copy(checkoutId = "other-checkout")))
      assertFalse(coordinator.resolve(request.copy(operationId = "other-operation")))
      assertFalse(coordinator.resolve(request.copy(requestId = "other-request")))
      assertFalse(
        coordinator.resolve(
          request.copy(
            kind =
              if (kind == CoordinatorRequestKind.ADVANCED_SUBMIT) {
                CoordinatorRequestKind.SESSION_BEFORE_SUBMIT
              } else {
                CoordinatorRequestKind.ADVANCED_SUBMIT
              },
          ),
        ),
      )
      assertTrue(coordinator.resolve(request))
      assertFalse(coordinator.resolve(request))
    }
  }

  @Test
  fun `replacement invalidation and timeout settle each supported request once`() {
    val causes =
      listOf(
        "timeout" to { _: CheckoutCoordinator, fixture: Fixture -> fixture.scheduler.fireLast() },
        "replacement" to { coordinator: CheckoutCoordinator, _: Fixture -> coordinator.setup() },
        "invalidation" to { coordinator: CheckoutCoordinator, _: Fixture -> coordinator.invalidate() },
        "host-loss" to { coordinator: CheckoutCoordinator, _: Fixture -> coordinator.hostDidDisappear() },
      )
    val kinds =
      listOf(
        CoordinatorRequestKind.ADVANCED_SUBMIT,
        CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS,
        CoordinatorRequestKind.SESSION_BEFORE_SUBMIT,
      )

    causes.forEach { (cause, trigger) ->
      kinds.forEach { kind ->
        val fixture = Fixture()
        val coordinator = fixture.coordinator()
        coordinator.setup()
        var fallbackCount = 0
        val request =
          coordinator.beginRequest(
            fixture.beginOperation(coordinator),
            kind,
            100,
            cancellationFallback = { fallbackCount += 1 },
          )

        trigger(coordinator, fixture)

        assertEquals("$cause must settle $kind once", 1, fallbackCount)
        assertFalse(coordinator.resolve(request))
      }
    }
  }

  @Test
  fun `timeout and invalidation cancel every owned resource`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.UNSUPPORTED_CAPABILITY, 100)

    fixture.scheduler.fireLast()
    assertFalse(coordinator.resolve(request))
    coordinator.invalidate()
    coordinator.invalidate()

    val controller = fixture.controllers.single()
    assertEquals(listOf(operationId), controller.releasedOperations)
    assertEquals(1, controller.disposeCount)
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
    val operationId = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    coordinator.hostDidDisappear()
    coordinator.hostDidDisappear()

    assertNull(coordinator.activeCheckoutId())
    assertNull(coordinator.activeOperationId())
    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.controllers.single().disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
  }

  @Test
  fun `stale query submit response and event cannot affect the current checkout`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutA = coordinator.setup()
    val operationA = fixture.beginOperation(coordinator)
    val requestA = coordinator.beginRequest(operationA, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    val checkoutB = coordinator.setup()

    assertFalse("stale query must not see B as active", coordinator.isActive(checkoutA))
    assertFalse("stale response must not settle B", coordinator.resolve(requestA))
    val staleEvents = fixture.events.filterIsInstance<CoordinatorEvent.StaleRequest>()
    assertEquals(requestA, staleEvents.single().request)
    assertTrue("the current checkout remains B", coordinator.isActive(checkoutB))
    assertNull("A submit owner was disposed with replacement", coordinator.activeOperationId())
  }

  @Test
  fun `late terminal invalidation releases the current resource ledger once`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operation = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operation, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    coordinator.completeOperation(operation)
    coordinator.invalidate()
    coordinator.invalidate()

    val controller = fixture.controllers.single()
    assertFalse(coordinator.resolve(request))
    assertEquals(listOf(operation), controller.releasedOperations)
    assertEquals(1, controller.disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
    assertNull(coordinator.activeCheckoutId())
  }

  @Test
  fun `configured event sink receives a generated request once`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = fixture.beginOperation(coordinator)

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
  fun `throwing request event delivery rolls back once and permits a fresh request`() {
    val fixture = Fixture()
    var throwsOnNextRequest = true
    val coordinator =
      fixture.coordinator(
        eventSink =
          object : CheckoutEventSink {
            override fun emit(event: CoordinatorEvent) {
              if (event is CoordinatorEvent.Request && throwsOnNextRequest) {
                throwsOnNextRequest = false
                throw IllegalStateException("Event delivery failed")
              }
              fixture.events += event
            }
          },
      )
    coordinator.setup()
    val operationId = fixture.beginOperation(coordinator)
    var fallbackCount = 0

    try {
      coordinator.beginRequest(
        operationId,
        CoordinatorRequestKind.ADVANCED_SUBMIT,
        100,
        cancellationFallback = { fallbackCount += 1 },
      )
      fail("Expected event delivery failure")
    } catch (_: IllegalStateException) {
      // Expected.
    }

    assertEquals(1, fallbackCount)
    assertTrue(
      fixture.scheduler.cancellations
        .single()
        .cancelled,
    )
    fixture.scheduler.fire(0)
    assertEquals(1, fallbackCount)

    val fresh =
      coordinator.beginRequest(
        operationId,
        CoordinatorRequestKind.ADVANCED_SUBMIT,
        100,
        cancellationFallback = { fallbackCount += 1 },
      )

    assertEquals("request-2", fresh.requestId)
    assertFalse(coordinator.resolve(CoordinatorRequest("checkout-1", operationId, "request-1", CoordinatorRequestKind.ADVANCED_SUBMIT)))
    assertEquals(1, fallbackCount)
    assertTrue(coordinator.resolve(fresh))
    assertEquals(1, fallbackCount)
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
    val operationId = fixture.beginOperation(coordinator)
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    fixture.scheduler.fireLast()
    coordinator.invalidate()

    assertFalse(coordinator.resolve(request))
    assertEquals(1, fixture.controllers.single().disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
  }

  @Test
  fun `CSE and standalone Action cleanup do not mutate checkout ownership`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val checkoutOperation = fixture.beginOperation(coordinator)
    val actionToken = ActionOperationToken.create()
    val csePromise = mock<Promise>()
    val cse = AdyenCSEModule(mock<ReactApplicationContext>())

    assertTrue(ActionOwnerRegistry.acquire(actionToken))
    cse.validateCardNumber("4111111111111111", true, csePromise)
    verify(csePromise).resolve(eq(true))
    coordinator.invalidate()

    assertNull(coordinator.activeCheckoutId())
    assertFalse(ActionOwnerRegistry.acquire(ActionOperationToken.create()))
    ActionOwnerRegistry.release(actionToken)
    assertEquals(checkoutOperation, "operation-1")
  }

  // endregion

  // region Embedded operations

  @Test
  fun `embedded operation acquisition is anonymous and retry releases only embedded ownership`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()

    val operationId = coordinator.acquireEmbeddedOperation("checkout-1")
    assertTrue(operationId != null)
    assertEquals(operationId, coordinator.activeOperationId())
    assertEquals(0, fixture.presenterFactory.createCount)
    assertNull(coordinator.acquireEmbeddedOperation("checkout-1"))

    coordinator.releaseEmbeddedOperation(requireNotNull(operationId))

    assertNull(coordinator.activeOperationId())
    assertTrue(coordinator.acquireEmbeddedOperation("checkout-1") != null)
  }

  @Test
  fun `embedded callback path rejects contenders and retains action details until terminal cleanup`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutId = coordinator.setup()
    val launcher = DropInLauncher()
    coordinator.registerDropInLauncher(launcher)

    val firstOperation = requireNotNull(coordinator.acquireEmbeddedOperation(checkoutId))
    assertEquals(0, fixture.presenterFactory.createCount)
    assertNull(coordinator.acquireEmbeddedOperation(checkoutId))
    assertNull(coordinator.activeRequest())

    try {
      fixture.beginOperation(coordinator)
      fail("Explicit contender must reject without binding")
    } catch (_: IllegalStateException) {
      assertTrue(
        fixture.controllers
          .single()
          .boundOperations
          .isEmpty(),
      )
      assertEquals(firstOperation, coordinator.activeOperationId())
    }

    try {
      coordinator.beginDropIn(mock<CheckoutContext.Sessions>())
      fail("Drop-in contender must reject without allocation")
    } catch (_: IllegalStateException) {
      assertEquals(0, fixture.presenterFactory.createCount)
      assertEquals(0, launcher.startCount)
      assertEquals(firstOperation, coordinator.activeOperationId())
    }

    val retryRequest = coordinator.beginRequest(firstOperation, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    assertTrue(coordinator.resolve(retryRequest))
    coordinator.releaseEmbeddedOperation(firstOperation)
    assertNull(coordinator.activeOperationId())

    val actionOperation = requireNotNull(coordinator.acquireEmbeddedOperation(checkoutId))
    val actionRequest = coordinator.beginRequest(actionOperation, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    assertTrue(coordinator.resolve(actionRequest))
    assertEquals(actionOperation, coordinator.activeOperationId())
    val detailsRequest =
      coordinator.beginRequest(actionOperation, CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS, 100)
    assertTrue(coordinator.resolve(detailsRequest))
    assertEquals(actionOperation, coordinator.activeOperationId())

    coordinator.invalidate()
    assertNull(coordinator.activeCheckoutId())
    val freshCheckoutId = coordinator.setup()
    assertFalse(coordinator.isActive(checkoutId))
    assertTrue(coordinator.isActive(freshCheckoutId))
  }

  @Test
  fun `first embedded failure acquires terminal ownership and cleans the checkout`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()

    val operationId = requireNotNull(coordinator.acquireEmbeddedOperation("checkout-1"))
    coordinator.emitTerminal("checkout-1", "error", """{"errorCode":"checkoutFailed"}""")
    coordinator.invalidate()

    assertEquals(operationId, "operation-1")
    assertEquals(
      listOf("error"),
      fixture.events
        .filterIsInstance<CoordinatorEvent.Terminal>()
        .map { it.kind },
    )
    assertNull(coordinator.activeCheckoutId())
    assertNull(coordinator.activeOperationId())
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
  }

  @Test
  fun `redirect return is consumed only by the active embedded operation`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val controller = mock<CheckoutController>()
    coordinator.setup()
    val redirectIntent = Intent()

    assertFalse(coordinator.handleReturn(Intent()))
    val operationId = requireNotNull(coordinator.acquireEmbeddedOperation("checkout-1"))
    coordinator.registerRedirectController(controller, operationId)

    assertTrue(coordinator.handleReturn(redirectIntent))
    verify(controller).handleReturn(eq(redirectIntent))

    coordinator.unregisterRedirectController(controller)
    assertFalse(coordinator.handleReturn(Intent()))
  }

  @Test
  fun `dismissed restored Activity fragment invalidates stale ownership and permits fresh registration`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val redirectController = mock<CheckoutController>()
    val checkoutId = coordinator.setup()
    val mounted = fixture.register(coordinator, "pm-card")
    val mountedView = ViewBinding()
    coordinator.bindControllerView(checkoutId, mounted.controllerId, mountedView)
    val operationId = fixture.beginOperation(coordinator)
    var requestFallbackCount = 0
    val request =
      coordinator.beginRequest(
        operationId,
        CoordinatorRequestKind.ADVANCED_SUBMIT,
        100,
        cancellationFallback = { requestFallbackCount += 1 },
      )
    coordinator.registerFragmentPresentation(operationId, cancellable = true, autoSubmit = false, onCancelled = {})
    coordinator.registerRedirectController(redirectController, operationId)
    coordinator.fragmentDismissed(operationId)

    assertTrue(coordinator.invalidateRestoredFragment(operationId))
    assertNull(coordinator.activeCheckoutId())
    assertNull(coordinator.activeOperationId())
    assertFalse(coordinator.resolve(request))
    assertEquals(1, requestFallbackCount)
    assertTrue(
      fixture.scheduler.cancellations
        .single()
        .cancelled,
    )
    val explicit = fixture.controllers.last()
    assertEquals(listOf(operationId), explicit.releasedOperations)
    assertEquals(1, explicit.disposeCount)
    assertEquals(1, mounted.controller.disposeCount)
    assertEquals(1, mountedView.detachCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
    assertFalse(coordinator.handleReturn(Intent()))
    verify(redirectController, never()).handleReturn(org.mockito.kotlin.any())
    assertFalse(coordinator.invalidateRestoredFragment(operationId))
    assertEquals(1, requestFallbackCount)
    assertEquals(1, explicit.disposeCount)
    assertEquals(1, mounted.controller.disposeCount)

    val replacementCheckoutId = coordinator.setup()
    val fresh = fixture.register(coordinator, "pm-card")
    coordinator.bindControllerView(replacementCheckoutId, fresh.controllerId, ViewBinding())

    assertTrue(coordinator.isControllerBound(fresh.controllerId))
    assertEquals(0, fresh.controller.disposeCount)
    assertFalse(coordinator.invalidateRestoredFragment(operationId))
    assertTrue(coordinator.isActive(replacementCheckoutId))
  }

  // endregion

  // region Drop-in

  @Test
  fun `session drop-in preserves its checkout context and reaches its identity-bound terminal result`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val launcher = DropInLauncher()
    val dropInPresenter = DropInPresenter()
    fixture.presenterFactory.presenter = dropInPresenter
    coordinator.setup()
    coordinator.registerDropInLauncher(launcher)
    val sessionContext = mock<CheckoutContext.Sessions>()

    val operationId = coordinator.beginDropIn(sessionContext)

    assertEquals("operation-1", operationId)
    assertEquals(1, launcher.startCount)
    assertEquals(listOf(sessionContext), launcher.contexts)
    assertEquals(operationId, coordinator.activeOperationId())

    launcher.finish(CoordinatorDropInResult.Completed("Authorised"))

    assertEquals(listOf(CoordinatorDropInResult.Completed("Authorised")), dropInPresenter.results)
    assertNull(coordinator.activeOperationId())
    assertEquals(1, launcher.clearResultCount)

    launcher.finish(CoordinatorDropInResult.Cancelled)

    assertEquals(listOf(CoordinatorDropInResult.Completed("Authorised")), dropInPresenter.results)
    assertEquals(1, launcher.clearResultCount)
  }

  @Test
  fun `unexpected session service callbacks return deterministic fallbacks without advanced events`() =
    runBlocking {
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      val launcher = DropInLauncher()
      val dropInPresenter = DropInPresenter()
      fixture.presenterFactory.presenter = dropInPresenter
      coordinator.setup()
      coordinator.registerDropInLauncher(launcher)
      val operationId =
        coordinator.beginDropIn(mock<CheckoutContext.Sessions>())
      fixture.events.clear()

      assertEquals(
        com.adyen.checkout.core.components.SubmitResult
          .Retry(null),
        coordinator.onDropInSubmit(mock()),
      )
      assertEquals(
        com.adyen.checkout.core.components.AdditionalDetailsResult
          .Completion("Error"),
        coordinator.onDropInAdditionalDetails(mock()),
      )
      assertTrue(fixture.events.isEmpty())
      assertEquals(operationId, coordinator.activeOperationId())
    }

  @Test
  fun `advanced drop-in rejects before operation presenter or launcher allocation`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val launcher = DropInLauncher()
    fixture.presenterFactory.presenter = DropInPresenter()
    coordinator.setup()
    coordinator.registerDropInLauncher(launcher)

    try {
      coordinator.beginDropIn(mock<CheckoutContext.Advanced>())
      fail("Expected advanced Drop-in to be unsupported")
    } catch (_: UnsupportedOperationException) {
      assertNull(coordinator.activeOperationId())
      assertNull(coordinator.activeRequest())
      assertEquals(0, fixture.presenterFactory.createCount)
      assertEquals(0, launcher.startCount)
      assertEquals(0, launcher.clearResultCount)
    }
  }

  @Test
  fun `drop-in cancellation and failure release their launcher operation once`() {
    listOf(
      CoordinatorDropInResult.Cancelled,
      CoordinatorDropInResult.Failed("presentation failed"),
    ).forEach { result ->
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      val launcher = DropInLauncher()
      val dropInPresenter = DropInPresenter()
      fixture.presenterFactory.presenter = dropInPresenter
      coordinator.setup()
      coordinator.registerDropInLauncher(launcher)
      coordinator.beginDropIn(mock<CheckoutContext.Sessions>())

      launcher.finish(result)
      launcher.finish(result)

      assertEquals(listOf(result), dropInPresenter.results)
      assertNull(coordinator.activeOperationId())
      assertEquals(1, launcher.clearResultCount)
    }
  }

  @Test
  fun `drop-in presenter cleanup cannot recursively invalidate an active coordinator disposal`() {
    val fixture = Fixture()
    lateinit var coordinator: CheckoutCoordinator
    val terminalPresenter =
      object : DropInPresenter() {
        override fun dispose() {
          super.dispose()
          coordinator.invalidate()
        }
      }
    fixture.presenterFactory.presenter = terminalPresenter
    coordinator = fixture.coordinator()
    coordinator.setup()
    coordinator.registerDropInLauncher(DropInLauncher())
    val registered = fixture.register(coordinator, "pm-card")
    coordinator.beginDropIn(mock<CheckoutContext.Sessions>())

    coordinator.invalidate()

    assertEquals(1, terminalPresenter.disposeCount)
    assertEquals(1, registered.controller.disposeCount)
    assertNull(coordinator.activeCheckoutId())
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
  }

  // endregion

  private inline fun <reified T : Throwable> expect(block: () -> Unit) {
    try {
      block()
    } catch (throwable: Throwable) {
      if (throwable is T) return
      throw AssertionError("Expected ${T::class.simpleName}, got $throwable", throwable)
    }
    fail("Expected ${T::class.simpleName}")
  }

  private class Registered(
    val controllerId: String,
    val controller: FakeController,
  )

  private class Fixture {
    val log = mutableListOf<String>()
    val factory = Factory(log)
    val presenterFactory = PresenterFactory(DropInPresenter())
    val events = mutableListOf<CoordinatorEvent>()
    val scheduler = Scheduler()
    val host = Host(log)
    val controllers = mutableListOf<FakeController>()
    var creations = 0
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

    fun register(
      coordinator: CheckoutCoordinator,
      paymentMethodId: String,
      controller: FakeController? = null,
      name: String = paymentMethodId,
    ): Registered {
      val checkoutId = checkNotNull(coordinator.activeCheckoutId())
      var created: FakeController? = null
      val registration =
        checkNotNull(
          coordinator.registerController(checkoutId, paymentMethodId) {
            creations += 1
            (controller ?: FakeController(log = log, name = name)).also {
              created = it
              controllers += it
            }
          },
        )
      return Registered(registration.controllerId, checkNotNull(created))
    }

    /** Begins an explicit submit with a registry controller, creating it on first use. */
    fun beginOperation(
      coordinator: CheckoutCoordinator,
      paymentMethodId: String = "pm-explicit",
    ): String {
      val checkoutId = checkNotNull(coordinator.activeCheckoutId())
      val registration =
        checkNotNull(
          coordinator.registerController(checkoutId, paymentMethodId) {
            creations += 1
            FakeController(log = log, name = paymentMethodId).also { controllers += it }
          },
        )
      return coordinator.beginControllerOperation(checkoutId, registration.controllerId)
    }
  }

  private class FakeController(
    override val checkoutController: CheckoutController? = null,
    override val requiresUserInteraction: Boolean = true,
    private val log: MutableList<String>? = null,
    private val name: String = "controller",
  ) : RegisteredController {
    val boundOperations = mutableListOf<String>()
    val releasedOperations = mutableListOf<String>()
    var disposeCount = 0
    var onDispose: () -> Unit = {}

    override fun bindOperation(operationId: String) {
      boundOperations += operationId
    }

    override fun releaseOperation(operationId: String) {
      releasedOperations += operationId
    }

    override fun dispose() {
      disposeCount += 1
      log?.add("dispose-$name")
      onDispose()
    }
  }

  private class ViewBinding(
    private val log: MutableList<String>? = null,
  ) : ControllerViewBinding {
    var detachCount = 0

    override fun detach() {
      detachCount += 1
      log?.add("detach")
    }
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

  private open class DropInPresenter :
    CoordinatorPresenter,
    CoordinatorDropInPresenter {
    val results = mutableListOf<CoordinatorDropInResult>()
    var disposeCount = 0

    override fun onDropInResult(result: CoordinatorDropInResult) {
      results += result
    }

    override fun dispose() {
      disposeCount += 1
    }
  }

  private class PresenterFactory(
    var presenter: CoordinatorPresenter,
  ) : com.adyenreactnativesdk.coordinator.PresenterFactory {
    var createCount = 0
    val presentations = mutableListOf<CoordinatorPresentation>()

    override fun create(presentation: CoordinatorPresentation): CoordinatorPresenter {
      createCount += 1
      presentations += presentation
      return presenter
    }
  }

  private class DropInLauncher : CoordinatorDropInLauncher {
    private var callback: ((CoordinatorDropInResult) -> Unit)? = null
    var startCount = 0
    var clearResultCount = 0
    val contexts = mutableListOf<CheckoutContext>()

    override fun start(
      context: CheckoutContext,
      onResult: (CoordinatorDropInResult) -> Unit,
    ) {
      startCount += 1
      contexts += context
      callback = onResult
    }

    override fun clearResult() {
      clearResultCount += 1
      callback = null
    }

    fun finish(result: CoordinatorDropInResult) {
      callback?.invoke(result)
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
        CoordinatorIdentityKind.CONTROLLER -> "controller-$next"
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

    fun fire(index: Int) {
      actions[index].invoke()
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
