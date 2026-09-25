/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.coordinator

import android.content.Intent
import com.adyen.checkout.core.components.CheckoutTarget
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
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
    val operationA = coordinator.beginOperation()
    val requestA = coordinator.beginRequest(operationA, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    fixture.factory.shouldFail = true

    try {
      coordinator.setup()
      fail("Expected B to fail")
    } catch (_: IllegalStateException) {
      assertNull(coordinator.activeCheckoutId())
      assertFalse(coordinator.resolve(requestA))
    }

    fixture.factory.shouldFail = false
    val checkoutC = coordinator.setup()

    assertFalse(coordinator.isActive(checkoutA))
    assertTrue(coordinator.isActive(checkoutC))
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
      val operationId = coordinator.beginOperation()
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
  fun `every payment surface contender is rejected without allocation or queueing`() {
    val surfaces = listOf("embedded", "headless", "drop-in")

    surfaces.forEach { owner ->
      surfaces.forEach { contender ->
        val fixture = Fixture()
        val coordinator = fixture.coordinator()
        coordinator.setup()
        val ownerOperation = coordinator.beginOperation()

        try {
          coordinator.beginOperation()
          fail("$owner should keep the slot against $contender")
        } catch (_: IllegalStateException) {
          assertEquals(1, fixture.presenterFactory.createCount)
          assertEquals(ownerOperation, coordinator.activeOperationId())
        }
        coordinator.completeOperation(ownerOperation)
        coordinator.beginOperation()
        assertEquals(2, fixture.presenterFactory.createCount)
      }
    }
  }

  @Test
  fun `replacement invalidation and timeout settle each supported request once`() {
    val causes =
      listOf(
        "timeout" to { coordinator: CheckoutCoordinator, _: String, fixture: Fixture -> fixture.scheduler.fireLast() },
        "replacement" to { coordinator: CheckoutCoordinator, _: String, _: Fixture -> coordinator.setup() },
        "invalidation" to { coordinator: CheckoutCoordinator, _: String, _: Fixture -> coordinator.invalidate() },
        "host-loss" to { coordinator: CheckoutCoordinator, _: String, _: Fixture -> coordinator.hostDidDisappear() },
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
            coordinator.beginOperation(),
            kind,
            100,
            cancellationFallback = { fallbackCount += 1 },
          )

        trigger(coordinator, cause, fixture)

        assertEquals("$cause must settle $kind once", 1, fallbackCount)
        assertFalse(coordinator.resolve(request))
      }
    }
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
  fun `stale query submit response and event cannot affect the current checkout`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val checkoutA = coordinator.setup()
    val operationA = coordinator.beginOperation()
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
  fun `same type stored IDs preserve exact native query and submit targets`() {
    val storedIDs = setOf("stored-first", "stored-second")
    val first = CheckoutTarget.StoredPaymentMethod("stored-first")
    val second = CheckoutTarget.StoredPaymentMethod("stored-second")
    val submitted = mutableListOf<CheckoutTarget>()

    assertTrue(nativeTargetIsAvailable(first, paymentMethodTypes = setOf("scheme"), storedIDs = storedIDs))
    assertTrue(nativeTargetIsAvailable(second, paymentMethodTypes = setOf("scheme"), storedIDs = storedIDs))
    submitNativeTarget(first, submitted)
    submitNativeTarget(second, submitted)

    assertEquals(listOf(first, second), submitted)
    assertFalse(nativeTargetIsAvailable(CheckoutTarget.StoredPaymentMethod("missing"), setOf("scheme"), storedIDs))
  }

  @Test
  fun `late terminal invalidation releases the current resource ledger once`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operation = coordinator.beginOperation()
    val request = coordinator.beginRequest(operation, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)
    coordinator.completeOperation(operation)
    coordinator.invalidate()
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
    assertNull(coordinator.activeCheckoutId())
  }

  @Test
  fun `representative session and advanced headless targets have coordinator owned identities`() {
    val targets =
      listOf(
        "sessions" to CheckoutTarget.PaymentMethod("scheme"),
        "advanced" to CheckoutTarget.StoredPaymentMethod("stored-second"),
      )

    targets.forEach { (_, target) ->
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      coordinator.setup()
      val operation = coordinator.beginOperation()

      assertTrue(nativeTargetIsAvailable(target, setOf("scheme"), setOf("stored-second")))
      assertEquals(
        operation,
        fixture.presenterFactory.presentations
          .single()
          .operationId,
      )
      coordinator.completeOperation(operation)
      assertEquals(1, fixture.presenter.disposeCount)
    }
  }

  @Test
  fun `CSE and standalone Action cleanup do not mutate checkout ownership`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val checkoutOperation = coordinator.beginOperation()
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

  private fun nativeTargetIsAvailable(
    target: CheckoutTarget,
    paymentMethodTypes: Set<String>,
    storedIDs: Set<String>,
  ): Boolean =
    when (target) {
      is CheckoutTarget.PaymentMethod -> target.type in paymentMethodTypes
      is CheckoutTarget.StoredPaymentMethod -> target.id in storedIDs
      else -> false
    }

  private fun submitNativeTarget(
    target: CheckoutTarget,
    submitted: MutableList<CheckoutTarget>,
  ) {
    submitted += target
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
  fun `query presenter disposal leaves an interactive request pending`() =
    runBlocking {
      val fixture = Fixture()
      val coordinator = fixture.coordinator()
      coordinator.setup()
      val operationId = coordinator.beginOperation()
      val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

      coordinator.withQueryPresenter { "query-result" }

      assertFalse(
        fixture.scheduler.cancellations
          .single()
          .cancelled,
      )
      assertTrue(coordinator.resolve(request))
    }

  @Test
  fun `distinct canonical passive presenters remain independently registered`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val first = Presenter()
    val second = Presenter()
    coordinator.setup()

    coordinator.registerPassivePresenter("checkout-1", "presenter-a", CheckoutTarget.PaymentMethod("scheme"), first)
    coordinator.registerPassivePresenter("checkout-1", "presenter-b", CheckoutTarget.StoredPaymentMethod("stored-card"), second)
    coordinator.unregisterPassivePresenter("checkout-1", "presenter-a", first)

    assertEquals(1, coordinator.passivePresenterCount())
    assertFalse(coordinator.isPassivePresenterActive("checkout-1", "presenter-a", first))
    assertTrue(coordinator.isPassivePresenterActive("checkout-1", "presenter-b", second))
    assertEquals(0, second.disposeCount)
  }

  @Test
  fun `duplicate canonical passive targets are rejected without replacing the original`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val original = Presenter()
    val duplicate = Presenter()
    coordinator.setup()

    coordinator.registerPassivePresenter("checkout-1", "presenter-a", CheckoutTarget.PaymentMethod("scheme"), original)

    try {
      coordinator.registerPassivePresenter("checkout-1", "presenter-b", CheckoutTarget.PaymentMethod("scheme"), duplicate)
      fail("Expected a duplicate canonical target to reject")
    } catch (_: IllegalStateException) {
      assertEquals(1, coordinator.passivePresenterCount())
      assertEquals(0, original.disposeCount)
      assertEquals(0, duplicate.disposeCount)
    }
  }

  @Test
  fun `duplicate stored IDs are rejected without disturbing distinct registrations`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val storedOriginal = Presenter()
    val regularSurvivor = Presenter()
    val duplicate = Presenter()
    coordinator.setup()

    coordinator.registerPassivePresenter(
      "checkout-1",
      "stored-original",
      CheckoutTarget.StoredPaymentMethod("stored-card"),
      storedOriginal,
    )
    coordinator.registerPassivePresenter(
      "checkout-1",
      "regular-survivor",
      CheckoutTarget.PaymentMethod("scheme"),
      regularSurvivor,
    )

    try {
      coordinator.registerPassivePresenter(
        "checkout-1",
        "stored-duplicate",
        CheckoutTarget.StoredPaymentMethod("stored-card"),
        duplicate,
      )
      fail("Expected a duplicate stored ID to reject")
    } catch (_: IllegalStateException) {
      assertEquals(2, coordinator.passivePresenterCount())
      assertTrue(coordinator.isPassivePresenterActive("checkout-1", "stored-original", storedOriginal))
      assertTrue(coordinator.isPassivePresenterActive("checkout-1", "regular-survivor", regularSurvivor))
      assertEquals(0, storedOriginal.disposeCount)
      assertEquals(0, regularSurvivor.disposeCount)
      assertEquals(0, duplicate.disposeCount)
    }
  }

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
  fun `dismissed restored Activity fragment invalidates stale ownership and permits fresh registration`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val stalePassivePresenter = Presenter()
    val freshPresenter = Presenter()
    val redirectController = mock<com.adyen.checkout.core.components.CheckoutController>()
    coordinator.setup()
    coordinator.registerPassivePresenter(
      "checkout-1",
      "stale-presenter",
      CheckoutTarget.StoredPaymentMethod("stored-card"),
      stalePassivePresenter,
    )
    val operationId = coordinator.beginOperation()
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
    assertEquals(1, fixture.presenter.disposeCount)
    assertEquals(1, stalePassivePresenter.disposeCount)
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
    assertEquals(1, fixture.host.releaseCount)
    assertFalse(coordinator.handleReturn(Intent()))
    assertFalse(coordinator.invalidateRestoredFragment(operationId))
    assertEquals(1, requestFallbackCount)
    assertEquals(1, fixture.presenter.disposeCount)
    assertEquals(1, stalePassivePresenter.disposeCount)

    val replacementCheckoutId = coordinator.setup()
    coordinator.registerPassivePresenter(
      replacementCheckoutId,
      "fresh-presenter",
      CheckoutTarget.StoredPaymentMethod("stored-card"),
      freshPresenter,
    )

    assertTrue(coordinator.isPassivePresenterActive(replacementCheckoutId, "fresh-presenter", freshPresenter))
    assertEquals(0, freshPresenter.disposeCount)
    assertFalse(coordinator.invalidateRestoredFragment(operationId))
    assertTrue(coordinator.isActive(replacementCheckoutId))
  }

  @Test
  fun `checkout replacement disposes passive presenters and stale unmount cannot remove a replacement`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val oldPresenter = Presenter()
    val replacementPresenter = Presenter()
    coordinator.setup()
    coordinator.registerPassivePresenter("checkout-1", "shared-presenter", CheckoutTarget.PaymentMethod("scheme"), oldPresenter)
    coordinator.setup()
    coordinator.registerPassivePresenter("checkout-2", "shared-presenter", CheckoutTarget.PaymentMethod("scheme"), replacementPresenter)

    coordinator.unregisterPassivePresenter("checkout-1", "shared-presenter", oldPresenter)

    assertEquals(1, oldPresenter.disposeCount)
    assertTrue(coordinator.isPassivePresenterActive("checkout-2", "shared-presenter", replacementPresenter))
  }

  @Test
  fun `redirect return is consumed only by its active passive presenter`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val presenter = Presenter()
    val controller = mock<com.adyen.checkout.core.components.CheckoutController>()
    coordinator.setup()
    coordinator.registerPassivePresenter("checkout-1", "presenter-a", CheckoutTarget.PaymentMethod("scheme"), presenter)
    val redirectIntent = Intent()

    assertFalse(coordinator.handleReturn(Intent()))
    val operationId = requireNotNull(coordinator.acquireEmbeddedOperation("checkout-1"))
    coordinator.registerRedirectController(controller, operationId)

    assertTrue(coordinator.handleReturn(redirectIntent))
    verify(controller).handleReturn(eq(redirectIntent))
  }

  @Test
  fun `terminal cleanup only clears the matching operation request`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    coordinator.setup()
    val operationId = coordinator.beginOperation()
    val request = coordinator.beginRequest(operationId, CoordinatorRequestKind.ADVANCED_SUBMIT, 100)

    coordinator.completeOperation("stale-operation")

    assertFalse(
      fixture.scheduler.cancellations
        .single()
        .cancelled,
    )
    assertTrue(coordinator.resolve(request))
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
  fun `drop-in owns one launcher operation and ignores its stale result after cleanup`() {
    val fixture = Fixture()
    val coordinator = fixture.coordinator()
    val launcher = DropInLauncher()
    val dropInPresenter = DropInPresenter()
    fixture.presenterFactory.presenter = dropInPresenter
    coordinator.setup()
    coordinator.registerDropInLauncher(launcher)

    val operationId = coordinator.beginDropIn(mock())

    assertEquals("operation-1", operationId)
    assertEquals(1, launcher.startCount)
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
      coordinator.beginDropIn(mock())

      launcher.finish(result)
      launcher.finish(result)

      assertEquals(listOf(result), dropInPresenter.results)
      assertNull(coordinator.activeOperationId())
      assertEquals(1, launcher.clearResultCount)
    }
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
    val operationId = coordinator.beginOperation()
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

  @Test
  fun `presenter terminal cleanup cannot recursively invalidate an active coordinator disposal`() {
    val fixture = Fixture()
    lateinit var coordinator: CheckoutCoordinator
    var disposeCount = 0
    val terminalPresenter =
      object : CoordinatorPresenter {
        override suspend fun createController(
          context: com.adyen.checkout.core.common.CheckoutContext,
          target: CheckoutTarget,
        ) = null

        override fun handleAction(action: com.adyen.checkout.core.action.data.Action) = Unit

        override fun complete(resultCode: String) = Unit

        override fun retry(message: String?) = Unit

        override fun dispose() {
          disposeCount += 1
          coordinator.invalidate()
        }
      }
    coordinator =
      CheckoutCoordinator(
        CheckoutCoordinatorDependencies(
          checkoutFactory = fixture.factory,
          presenterFactory =
            object : PresenterFactory(fixture.presenter) {
              override fun create(presentation: CoordinatorPresentation): CoordinatorPresenter = terminalPresenter
            },
          eventSink =
            object : CheckoutEventSink {
              override fun emit(event: CoordinatorEvent) {
                fixture.events += event
              }
            },
          identityGenerator = Identities(),
          scheduler = fixture.scheduler,
          hostLauncherAdapter = fixture.host,
        ),
      )
    coordinator.setup()
    coordinator.beginOperation()

    coordinator.invalidate()

    assertEquals(1, disposeCount)
    assertNull(coordinator.activeCheckoutId())
    assertEquals(
      1,
      fixture.factory.checkouts
        .single()
        .disposeCount,
    )
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

  private open class Presenter : CoordinatorPresenter {
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

  private open class PresenterFactory(
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

  private class DropInPresenter :
    Presenter(),
    CoordinatorDropInPresenter {
    val results = mutableListOf<CoordinatorDropInResult>()

    override suspend fun onDropInSubmit(data: com.adyen.checkout.core.components.data.PaymentComponentData<*>) =
      com.adyen.checkout.core.components.SubmitResult
        .Retry(null)

    override suspend fun onDropInAdditionalDetails(data: com.adyen.checkout.core.action.data.ActionComponentData) =
      com.adyen.checkout.core.components.AdditionalDetailsResult
        .Completion("Error")

    override fun onDropInResult(result: CoordinatorDropInResult) {
      results += result
    }
  }

  private class DropInLauncher : CoordinatorDropInLauncher {
    private var callback: ((CoordinatorDropInResult) -> Unit)? = null
    var startCount = 0
    var clearResultCount = 0

    override fun start(
      context: com.adyen.checkout.core.common.CheckoutContext,
      onResult: (CoordinatorDropInResult) -> Unit,
    ) {
      startCount += 1
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
