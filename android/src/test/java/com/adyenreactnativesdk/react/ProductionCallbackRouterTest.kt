/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.BeforeSubmitResult
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.BeforeSubmitData
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.components.paymentmethod.PaymentMethodDetails
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutCoordinatorDependencies
import com.adyenreactnativesdk.coordinator.CheckoutEventSink
import com.adyenreactnativesdk.coordinator.CheckoutFactory
import com.adyenreactnativesdk.coordinator.CheckoutHostLauncherAdapter
import com.adyenreactnativesdk.coordinator.CheckoutIdentityGenerator
import com.adyenreactnativesdk.coordinator.CheckoutScheduler
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.coordinator.CoordinatorCancellation
import com.adyenreactnativesdk.coordinator.CoordinatorCheckout
import com.adyenreactnativesdk.coordinator.CoordinatorDropInLauncher
import com.adyenreactnativesdk.coordinator.CoordinatorDropInResult
import com.adyenreactnativesdk.coordinator.CoordinatorEvent
import com.adyenreactnativesdk.coordinator.CoordinatorIdentityKind
import com.adyenreactnativesdk.coordinator.CoordinatorRequest
import com.adyenreactnativesdk.coordinator.PresenterFactory
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

/**
 * These tests deliberately enter the routers invoked by real Fabric callbacks and settle their
 * generated request tuples through [AndroidCheckoutModule.respond], rather than calling
 * coordinator helper methods as the evidence surface.
 */
@RunWith(RobolectricTestRunner::class)
class ProductionCallbackRouterTest {
  @After
  fun tearDown() {
    CheckoutCoordinator.shared.invalidate()
  }

  @Test
  fun `Fabric advanced router retains action details releases retry and cleans one terminal`() {
    val module = module()
    val actions = mutableListOf<Action>()
    val completions = mutableListOf<String>()
    val retries = mutableListOf<String?>()
    val checkoutId = setupAdvanced()
    val sink =
      FabricComponentEventSink(
        checkoutId = checkoutId,
        bindEmbeddedOperation = {},
        handleAction = actions::add,
        complete = completions::add,
        retry = retries::add,
      )

    assertTrue(sink.onInteractionStarted())
    sink.onAdvancedSubmit(paymentData())
    val actionRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
    module.respond(
      response(
        actionRequest,
        """{"type":"action","action":{"type":"redirect","paymentMethodType":"scheme","url":"https://example.test"}}""",
      ),
      PromiseRecorder(),
    )
    assertEquals(1, actions.size)
    assertEquals(actionRequest.operationId, CheckoutCoordinator.shared.activeOperationId())

    sink.onAdvancedAdditionalDetails(ActionComponentData(details = null, paymentData = "payment-data"))
    val detailsRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
    module.respond(response(detailsRequest, """{"resultCode":"Authorised"}"""), PromiseRecorder())
    assertEquals(listOf("Authorised"), completions)
    assertEquals(actionRequest.operationId, CheckoutCoordinator.shared.activeOperationId())

    sink.onComplete("Authorised")
    sink.onError()
    assertNull(CheckoutCoordinator.shared.activeCheckoutId())
    assertEquals(listOf("Authorised"), completions)

    val retryCheckoutId = setupAdvanced()
    val retrySink =
      FabricComponentEventSink(
        checkoutId = retryCheckoutId,
        bindEmbeddedOperation = {},
        handleAction = actions::add,
        complete = completions::add,
        retry = retries::add,
      )
    assertTrue(retrySink.onInteractionStarted())
    retrySink.onAdvancedSubmit(paymentData())
    val retryRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
    module.respond(response(retryRequest, """{"type":"retry","message":"Try again"}"""), PromiseRecorder())

    assertEquals(listOf("Try again"), retries)
    assertNull(CheckoutCoordinator.shared.activeOperationId())
    assertTrue(retrySink.onInteractionStarted())
  }

  @Test
  fun `Fabric advanced router completes through respond before terminal cleanup releases ownership`() {
    val module = module()
    val completions = mutableListOf<String>()
    val checkoutId = setupAdvanced()
    val sink =
      FabricComponentEventSink(
        checkoutId = checkoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = completions::add,
        retry = {},
      )

    assertTrue(sink.onInteractionStarted())
    sink.onAdvancedSubmit(paymentData())
    val request = requireNotNull(CheckoutCoordinator.shared.activeRequest())
    module.respond(
      response(request, """{"type":"completed","resultCode":"Authorised"}"""),
      PromiseRecorder(),
    )

    assertEquals(listOf("Authorised"), completions)
    assertEquals(request.operationId, CheckoutCoordinator.shared.activeOperationId())
    assertEquals(checkoutId, CheckoutCoordinator.shared.activeCheckoutId())

    sink.onComplete("Authorised")

    assertNull(CheckoutCoordinator.shared.activeCheckoutId())
    assertEquals(listOf("Authorised"), completions)

    val replacementCheckoutId = setupAdvanced()
    val replacementSink =
      FabricComponentEventSink(
        checkoutId = replacementCheckoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = {},
        retry = {},
      )
    assertTrue(replacementSink.onInteractionStarted())
  }

  @Test
  fun `competing Fabric callback routers assert ownership without a second event and retry natively`() {
    val emittedKinds = mutableListOf<String>()
    module(emittedKinds = emittedKinds)
    val checkoutId = setupAdvanced()
    val firstRetries = mutableListOf<String?>()
    val competingRetries = mutableListOf<String?>()
    val first =
      FabricComponentEventSink(
        checkoutId = checkoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = {},
        retry = firstRetries::add,
      )
    val competing =
      FabricComponentEventSink(
        checkoutId = checkoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = {},
        retry = competingRetries::add,
      )

    assertTrue(first.onInteractionStarted())
    first.onAdvancedSubmit(paymentData())
    assertFalse(competing.onInteractionStarted())
    competing.onAdvancedSubmit(paymentData())
    competing.onError()

    assertEquals(listOf("advancedSubmit"), emittedKinds)
    assertEquals(listOf(null), competingRetries)
    assertTrue(firstRetries.isEmpty())
    assertEquals(1, emittedKinds.count { it == "advancedSubmit" })
  }

  @Test
  fun `active Fabric operation rejects supported generated session Drop-in without launching it`() {
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    val module = module(activity)
    val checkoutId = setupSession()
    val launcher = DropInLauncher()
    CheckoutCoordinator.shared.registerDropInLauncher(launcher)
    assertTrue(CheckoutCoordinator.shared.acquireEmbeddedOperation(checkoutId) != null)
    val promise = PromiseRecorder()

    module.startDropIn(checkoutId, promise)

    assertEquals("operationBusy", promise.code)
    assertEquals(0, launcher.startCount)
    assertEquals(0, launcher.clearCount)
    assertTrue(CheckoutCoordinator.shared.isActive(checkoutId))
  }

  @Test
  fun `active Fabric operation rejects generated headless submit without queuing it`() {
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    val module = module(activity)
    val checkoutId = setupAdvancedWithCard()
    assertTrue(CheckoutCoordinator.shared.acquireEmbeddedOperation(checkoutId) != null)
    val promise = PromiseRecorder()
    val target =
      JavaOnlyMap().apply {
        putString("kind", "paymentMethod")
        putString("type", "scheme")
      }

    module.submit(checkoutId, target, promise)

    assertEquals("operationBusy", promise.code)
    assertTrue(CheckoutCoordinator.shared.isActive(checkoutId))
  }

  @Test
  fun `Fabric session router normalizes terminal payloads and suppresses a late completion after failure`() {
    val terminalEvents = mutableListOf<CoordinatorEvent.Terminal>()
    module(terminalEvents = terminalEvents)
    val checkoutId = setupSession()
    val completionSink =
      FabricComponentEventSink(
        checkoutId = checkoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = {},
        retry = {},
      )

    assertTrue(completionSink.onInteractionStarted())
    completionSink.onSessionComplete(
      SessionCheckoutResult(
        resultCode = CheckoutResultCode.AUTHORISED,
        sessionId = "session-id",
        sessionData = "session-data",
      ),
    )

    assertEquals(1, terminalEvents.size)
    assertEquals("completion", terminalEvents.single().kind)
    assertNormalizedPayload(
      terminalEvents.single().payloadJson,
      expectedFields =
        mapOf(
          "resultCode" to "Authorised",
          "sessionId" to "session-id",
          "sessionData" to "session-data",
        ),
    )
    assertNull(CheckoutCoordinator.shared.activeCheckoutId())

    val failureCheckoutId = setupSession()
    val failureSink =
      FabricComponentEventSink(
        checkoutId = failureCheckoutId,
        bindEmbeddedOperation = {},
        handleAction = {},
        complete = {},
        retry = {},
      )
    assertTrue(failureSink.onInteractionStarted())
    failureSink.onError()
    failureSink.onSessionComplete(
      SessionCheckoutResult(
        resultCode = CheckoutResultCode.AUTHORISED,
        sessionId = "late-session-id",
        sessionData = "late-session-data",
      ),
    )

    assertEquals(2, terminalEvents.size)
    assertEquals("error", terminalEvents.last().kind)
    assertNormalizedPayload(
      terminalEvents.last().payloadJson,
      expectedFields =
        mapOf(
          "message" to "Checkout failed",
          "errorCode" to "checkoutFailed",
        ),
    )
    assertNull(CheckoutCoordinator.shared.activeCheckoutId())
  }

  @Test
  fun `Fabric session and advanced routers reject malformed and stale tuples without cross settlement`() =
    runBlocking {
      val module = module()
      val checkoutId = setupAdvanced()
      val retries = mutableListOf<String?>()
      val sink =
        FabricComponentEventSink(
          checkoutId = checkoutId,
          bindEmbeddedOperation = {},
          handleAction = {},
          complete = {},
          retry = retries::add,
        )

      assertTrue(sink.onInteractionStarted())
      sink.onAdvancedSubmit(paymentData())
      val advancedRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
      val malformedPromise = PromiseRecorder()
      module.respond(response(advancedRequest, """{"type":"action"}"""), malformedPromise)
      assertEquals("staleRequest", malformedPromise.code)
      assertEquals(advancedRequest, CheckoutCoordinator.shared.activeRequest())

      val stalePromise = PromiseRecorder()
      module.respond(response(advancedRequest.copy(requestId = "stale-request"), """{"type":"retry"}"""), stalePromise)
      assertEquals("staleRequest", stalePromise.code)
      assertEquals(advancedRequest, CheckoutCoordinator.shared.activeRequest())

      module.respond(response(advancedRequest, """{"type":"retry"}"""), PromiseRecorder())
      assertEquals(listOf(null), retries)
      assertNull(CheckoutCoordinator.shared.activeOperationId())

      val sessionCheckoutId = setupSession()
      assertTrue(CheckoutCoordinator.shared.acquireEmbeddedOperation(sessionCheckoutId) != null)
      lateinit var beforeSubmit: SessionBeforeSubmitBridge
      beforeSubmit =
        SessionBeforeSubmitBridge(mock<MessageBus>()) { payload -> SessionBeforeSubmitCallbackRouter.route(beforeSubmit, payload) }
      val result = async(start = CoroutineStart.UNDISPATCHED) { beforeSubmit.onBeforeSubmit(mock<BeforeSubmitData>()) }
      val sessionRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
      assertEquals(sessionCheckoutId, sessionRequest.checkoutId)

      val staleSessionPromise = PromiseRecorder()
      module.respond(response(sessionRequest.copy(operationId = "stale-operation"), """{"type":"abort"}"""), staleSessionPromise)
      assertEquals("staleRequest", staleSessionPromise.code)
      assertFalse(result.isCompleted)

      module.respond(response(sessionRequest, """{"type":"proceed","data":{}}"""), PromiseRecorder())
      assertTrue(result.await() is BeforeSubmitResult.Proceed)

      CheckoutCoordinator.shared.invalidate()
      val abortCheckoutId = setupSession()
      assertTrue(CheckoutCoordinator.shared.acquireEmbeddedOperation(abortCheckoutId) != null)
      lateinit var abortBridge: SessionBeforeSubmitBridge
      abortBridge =
        SessionBeforeSubmitBridge(mock<MessageBus>()) { payload -> SessionBeforeSubmitCallbackRouter.route(abortBridge, payload) }
      val abortResult = async(start = CoroutineStart.UNDISPATCHED) { abortBridge.onBeforeSubmit(mock<BeforeSubmitData>()) }
      val abortRequest = requireNotNull(CheckoutCoordinator.shared.activeRequest())
      assertEquals(abortCheckoutId, abortRequest.checkoutId)
      module.respond(response(abortRequest, """{"type":"abort"}"""), PromiseRecorder())
      assertTrue(abortResult.await() is BeforeSubmitResult.Abort)
    }

  private fun setupAdvanced(): String = setupEmbedded(mock<CheckoutContext.Advanced>())

  private fun setupSession(): String = setupEmbedded(mock<CheckoutContext.Sessions>())

  private fun setupAdvancedWithCard(): String {
    val context = mock<CheckoutContext.Advanced>()
    whenever(context.paymentMethods)
      .thenReturn(
        PaymentMethods.SERIALIZER.deserialize(
          JSONObject("""{"paymentMethods":[{"type":"scheme","name":"Card","brands":["visa"]}]}"""),
        ),
      )
    return setupEmbedded(context)
  }

  private fun setupEmbedded(context: CheckoutContext): String {
    val checkoutId =
      CheckoutCoordinator.shared.setup {
        StateOwner(CheckoutState(context))
      }
    return checkoutId
  }

  private fun module(
    activity: FragmentActivity? = null,
    emittedKinds: MutableList<String>? = null,
    terminalEvents: MutableList<CoordinatorEvent.Terminal>? = null,
  ): AndroidCheckoutModule {
    val context = mock<ReactApplicationContext>()
    doAnswer { invocation ->
      (invocation.arguments[0] as Runnable).run()
      null
    }.whenever(context).runOnUiQueueThread(any())
    whenever(context.currentActivity).thenReturn(activity)
    val module =
      AndroidCheckoutModule(
        reactContext = context,
        messageBus = mock(),
        capabilityMetadataFactory = { JavaOnlyMap() },
      )
    CheckoutCoordinator.shared.configureRuntimeDependencies(
      CheckoutCoordinatorDependencies(
        checkoutFactory =
          object : CheckoutFactory {
            override fun create(): CoordinatorCheckout = error("Direct fixture setup supplies the checkout")
          },
        presenterFactory =
          object : PresenterFactory {
            override fun create(presentation: com.adyenreactnativesdk.coordinator.CoordinatorPresentation) =
              error("Contending operations must not allocate a presenter")
          },
        eventSink =
          object : CheckoutEventSink {
            override fun emit(event: CoordinatorEvent) {
              when (event) {
                is CoordinatorEvent.Request -> {
                  event.eventKind?.let { emittedKinds?.add(it) }
                }

                is CoordinatorEvent.Terminal -> {
                  emittedKinds?.add(event.kind)
                  terminalEvents?.add(event)
                }

                else -> {
                  Unit
                }
              }
            }
          },
        identityGenerator =
          object : CheckoutIdentityGenerator {
            override fun next(kind: CoordinatorIdentityKind): String = "$kind-${java.util.UUID.randomUUID()}"
          },
        scheduler =
          object : CheckoutScheduler {
            override fun schedule(
              delayMillis: Long,
              action: () -> Unit,
            ): CoordinatorCancellation =
              object : CoordinatorCancellation {
                override fun cancel() = Unit
              }
          },
        hostLauncherAdapter =
          object : CheckoutHostLauncherAdapter {
            override fun releaseCheckoutHost() = Unit
          },
      ),
    )
    return module
  }

  private fun assertNormalizedPayload(
    payloadJson: String?,
    expectedFields: Map<String, String>,
  ) {
    val payload = JSONObject(requireNotNull(payloadJson))
    assertEquals(expectedFields.size, payload.length())
    expectedFields.forEach { (key, value) ->
      assertEquals(value, payload.getString(key))
    }
  }

  private fun paymentData(): PaymentComponentData<PaymentMethodDetails> = PaymentComponentData(paymentMethod = null, order = null)

  private fun response(
    request: CoordinatorRequest,
    payload: String,
  ): JavaOnlyMap =
    JavaOnlyMap().apply {
      putString("checkoutId", request.checkoutId)
      putString("operationId", request.operationId)
      putString("requestId", request.requestId)
      putString(
        "kind",
        when (request.kind.name) {
          "ADVANCED_SUBMIT" -> "advancedSubmit"
          "ADVANCED_ADDITIONAL_DETAILS" -> "advancedAdditionalDetails"
          else -> "sessionBeforeSubmit"
        },
      )
      putString("payloadJson", payload)
    }

  private class StateOwner(
    override val checkoutState: CheckoutState,
  ) : CheckoutStateOwner {
    override fun dispose() = Unit
  }

  private class DropInLauncher : CoordinatorDropInLauncher {
    var startCount = 0
    var clearCount = 0

    override fun start(
      context: CheckoutContext,
      onResult: (CoordinatorDropInResult) -> Unit,
    ) {
      startCount += 1
    }

    override fun clearResult() {
      clearCount += 1
    }
  }

  private class PromiseRecorder : Promise {
    var code: String? = null

    override fun resolve(value: Any?) = Unit

    override fun reject(
      code: String?,
      message: String?,
    ) {
      this.code = code
    }

    override fun reject(
      code: String?,
      throwable: Throwable?,
    ) = Unit

    override fun reject(
      code: String?,
      message: String?,
      throwable: Throwable?,
    ) = Unit

    override fun reject(throwable: Throwable) = Unit

    override fun reject(
      throwable: Throwable,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      throwable: Throwable?,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      message: String?,
      userInfo: WritableMap,
    ) {
      this.code = code
    }

    override fun reject(
      code: String?,
      message: String?,
      throwable: Throwable?,
      userInfo: WritableMap?,
    ) = Unit

    @Deprecated("Required to implement Promise")
    override fun reject(message: String) = Unit
  }
}
