/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.CheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.error.CheckoutError
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.NativeControllerFactory
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutCoordinatorDependencies
import com.adyenreactnativesdk.coordinator.CheckoutEventSink
import com.adyenreactnativesdk.coordinator.CheckoutFactory
import com.adyenreactnativesdk.coordinator.CheckoutHostLauncherAdapter
import com.adyenreactnativesdk.coordinator.CheckoutIdentityGenerator
import com.adyenreactnativesdk.coordinator.CheckoutScheduler
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.coordinator.ControllerViewBinding
import com.adyenreactnativesdk.coordinator.CoordinatorCancellation
import com.adyenreactnativesdk.coordinator.CoordinatorCheckout
import com.adyenreactnativesdk.coordinator.CoordinatorEvent
import com.adyenreactnativesdk.coordinator.CoordinatorIdentityKind
import com.adyenreactnativesdk.coordinator.CoordinatorPresentation
import com.adyenreactnativesdk.coordinator.PresenterFactory
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidCheckoutModuleTest {
  @After
  fun tearDown() {
    CheckoutCoordinator.shared.invalidate()
  }

  @Test
  fun `setting SDK version updates the package analytics version`() {
    val module = AndroidCheckoutModule(mainThreadContext(), { JavaOnlyMap() }, ControllerFactory())
    val previousVersion = AdyenPaymentPackage.sdkVersion

    try {
      module.setSdkVersion("test-version")
      assertEquals("test-version", AdyenPaymentPackage.sdkVersion)
    } finally {
      AdyenPaymentPackage.sdkVersion = previousVersion
      AdyenPaymentPackage.configureAnalytics()
    }
  }

  @Test
  fun `advanced drop-in rejects before activity operation request presenter or event creation`() {
    val harness = Harness()
    val checkoutId = harness.setupAdvanced()
    val promise = PromiseRecorder()

    harness.module.startDropIn(checkoutId, promise)

    assertEquals("unsupportedCapability", promise.code)
    assertEquals("Advanced Drop-in is unsupported by Android SDK 6.0.0-alpha.1", promise.message)
    assertEquals("advancedDropIn", promise.metadata?.getString("capability"))
    assertEquals("presentation", promise.metadata?.getString("phase"))
    assertNull(CheckoutCoordinator.shared.activeOperationId())
    assertNull(CheckoutCoordinator.shared.activeRequest())
  }

  @Test
  fun `session and advanced lookup reject before creating requests callbacks or UI`() {
    val context = mock<ReactApplicationContext>()
    val sessionPromise = PromiseRecorder()
    val advancedPromise = PromiseRecorder()
    val module = AndroidCheckoutModule(context, { JavaOnlyMap() }, ControllerFactory())
    val configuration = """{"clientKey":"test_client_key","card":{"addressVisibility":"lookup"}}"""

    module.setupSession("""{"id":"session-id","sessionData":"session-data"}""", configuration, sessionPromise)
    module.setupAdvanced("""{"paymentMethods":[]}""", configuration, advancedPromise)

    assertUnsupportedAddressLookup(sessionPromise)
    assertUnsupportedAddressLookup(advancedPromise)
    verify(context).runOnUiQueueThread(any())
    assertNull(CheckoutCoordinator.shared.activeCheckoutId())
    assertNull(CheckoutCoordinator.shared.activeRequest())
  }

  @Test
  fun `descriptor publishes stamped ids that each resolve to their exact controller`() {
    val harness = Harness()
    val checkoutId = harness.setupAdvanced()

    val ids = harness.regularIds(checkoutId)
    val card = harness.createController(checkoutId, ids.getValue("scheme")).resolvedMap()

    assertEquals(ids.values.size, ids.values.toSet().size)
    assertTrue(ids.values.all { it.isNotBlank() })
    assertNotNull(card.getString("controllerId"))
    assertEquals(listOf<CheckoutTarget>(CheckoutTarget.PaymentMethod("scheme")), harness.factory.targets)
  }

  @Test
  fun `requiresUserInteraction is resolved once from the created SDK controller`() {
    val harness = Harness(ControllerFactory(headlessTypes = setOf("paypal")))
    val checkoutId = harness.setupAdvanced()
    val ids = harness.regularIds(checkoutId)

    val card = harness.createController(checkoutId, ids.getValue("scheme")).resolvedMap()
    val paypal = harness.createController(checkoutId, ids.getValue("paypal")).resolvedMap()

    assertTrue(card.getBoolean("requiresUserInteraction"))
    assertFalse(paypal.getBoolean("requiresUserInteraction"))
    harness.factory.controllers.forEach { verify(it, times(1)).requiresUserInteraction() }
  }

  @Test
  fun `createController is idempotent and isAvailable shares the eagerly created controller`() {
    val harness = Harness()
    val checkoutId = harness.setupAdvanced()
    val cardId = harness.regularIds(checkoutId).getValue("scheme")

    val available = harness.isAvailable(checkoutId, cardId)
    val first = harness.createController(checkoutId, cardId).resolvedMap()
    val second = harness.createController(checkoutId, cardId).resolvedMap()

    assertEquals(true, available.value)
    assertEquals(first.getString("controllerId"), second.getString("controllerId"))
    assertEquals(1, harness.factory.targets.size)
    assertEquals(1, CheckoutCoordinator.shared.controllerCount())
  }

  @Test
  fun `duplicate type instances get distinct ids and a later instance is never substituted by the first`() {
    val harness = Harness()
    val checkoutId = harness.setupAdvanced()
    val (firstGiftcard, secondGiftcard) = harness.idsOfType(checkoutId, "giftcard")

    val firstAvailable = harness.isAvailable(checkoutId, firstGiftcard)
    val secondAvailable = harness.isAvailable(checkoutId, secondGiftcard)
    val secondController = harness.createController(checkoutId, secondGiftcard)

    assertNotEquals(firstGiftcard, secondGiftcard)
    assertEquals(true, firstAvailable.value)
    assertEquals(false, secondAvailable.value)
    assertNull("a non-creatable instance resolves false rather than rejecting", secondAvailable.code)
    assertUnsupportedPaymentMethod(secondController)
    assertEquals(listOf<CheckoutTarget>(CheckoutTarget.PaymentMethod("giftcard")), harness.factory.targets)
    assertEquals(1, CheckoutCoordinator.shared.controllerCount())
  }

  @Test
  fun `a present payment method the SDK cannot build resolves unavailable without a terminal event`() {
    val harness = Harness(ControllerFactory(failingTypes = setOf("paypal")))
    val checkoutId = harness.setupAdvanced()
    val paypalId = harness.regularIds(checkoutId).getValue("paypal")

    val available = harness.isAvailable(checkoutId, paypalId)
    val created = harness.createController(checkoutId, paypalId)

    assertEquals(false, available.value)
    assertNull(available.code)
    assertUnsupportedPaymentMethod(created)
    assertEquals("creation is attempted once and remembered", 1, harness.factory.targets.size)
    assertTrue(harness.events.none { it is CoordinatorEvent.Terminal })
    assertTrue(CheckoutCoordinator.shared.isActive(checkoutId))
    assertEquals(0, CheckoutCoordinator.shared.controllerCount())
  }

  @Test
  fun `foreign payment method ids reject invalidTarget and stale checkouts reject staleCheckout`() {
    val harness = Harness()
    val oldCheckoutId = harness.setupAdvanced()
    val oldCardId = harness.regularIds(oldCheckoutId).getValue("scheme")
    val checkoutId = harness.setupAdvanced()

    assertEquals("invalidTarget", harness.isAvailable(checkoutId, "foreign-id").code)
    assertEquals("invalidTarget", harness.createController(checkoutId, "foreign-id").code)
    assertEquals("invalidTarget", harness.createController(checkoutId, oldCardId).code)
    assertEquals("staleCheckout", harness.isAvailable(oldCheckoutId, oldCardId).code)
    assertEquals("staleCheckout", harness.createController(oldCheckoutId, oldCardId).code)
    assertTrue(harness.factory.targets.isEmpty())
  }

  @Test
  fun `submitController submits a mounted controller in place with its existing SDK controller`() {
    val harness = Harness()
    val checkoutId = harness.setupAdvanced()
    val controllerId = harness.createController(checkoutId, harness.regularIds(checkoutId).getValue("scheme")).controllerId()
    CheckoutCoordinator.shared.bindControllerView(checkoutId, controllerId, ControllerViewBinding {})
    val promise = PromiseRecorder()

    harness.module.submitController(checkoutId, controllerId, promise)
    harness.activity.supportFragmentManager.executePendingTransactions()

    assertTrue(promise.resolved)
    verify(harness.factory.controllers.single()).submit()
    assertNotNull(CheckoutCoordinator.shared.activeOperationId())
    assertEquals(1, harness.factory.targets.size)
    assertTrue(
      harness.activity.supportFragmentManager.fragments
        .none { it is CheckoutFragment },
    )
  }

  @Test
  fun `submitController hosts an unmounted controller in the bottom sheet without creating another`() {
    val harness = Harness(ControllerFactory(headlessTypes = setOf("paypal")))
    val checkoutId = harness.setupAdvanced()
    val controllerId = harness.createController(checkoutId, harness.regularIds(checkoutId).getValue("paypal")).controllerId()
    val promise = PromiseRecorder()

    harness.module.submitController(checkoutId, controllerId, promise)
    harness.activity.supportFragmentManager.executePendingTransactions()

    val operationId = checkNotNull(CheckoutCoordinator.shared.activeOperationId())
    assertTrue(promise.resolved)
    assertNotNull(
      harness.activity.supportFragmentManager.findFragmentByTag("${CheckoutFragment.COORDINATOR_TAG_PREFIX}-$operationId"),
    )
    assertEquals(harness.factory.controllers.single(), CheckoutCoordinator.shared.fragmentController(operationId))
    verify(harness.factory.controllers.single(), times(1)).submit()
    assertEquals(1, harness.factory.targets.size)
  }

  @Test
  fun `submitController rejects unknown stale and busy commands without touching the SDK`() {
    val harness = Harness()
    val oldCheckoutId = harness.setupAdvanced()
    val oldControllerId = harness.createController(oldCheckoutId, harness.regularIds(oldCheckoutId).getValue("scheme")).controllerId()
    val checkoutId = harness.setupAdvanced()
    val controllerId = harness.createController(checkoutId, harness.regularIds(checkoutId).getValue("scheme")).controllerId()

    val unknown = PromiseRecorder().also { harness.module.submitController(checkoutId, oldControllerId, it) }
    val stale = PromiseRecorder().also { harness.module.submitController(oldCheckoutId, oldControllerId, it) }
    assertNotNull(CheckoutCoordinator.shared.acquireEmbeddedOperation(checkoutId))
    val busy = PromiseRecorder().also { harness.module.submitController(checkoutId, controllerId, it) }

    assertEquals("invalidTarget", unknown.code)
    assertEquals("staleCheckout", stale.code)
    assertEquals("operationBusy", busy.code)
    harness.factory.controllers.forEach { verify(it, times(0)).submit() }
  }

  @Test
  fun `retry ends an explicit controller submission so it can be submitted again`() =
    runBlocking {
      val harness = Harness()
      val checkoutId = harness.setupAdvanced()
      val controllerId = harness.createController(checkoutId, harness.regularIds(checkoutId).getValue("scheme")).controllerId()
      CheckoutCoordinator.shared.bindControllerView(checkoutId, controllerId, ControllerViewBinding {})
      harness.module.submitController(checkoutId, controllerId, PromiseRecorder())
      val operationId = checkNotNull(CheckoutCoordinator.shared.activeOperationId())

      val result =
        async(start = CoroutineStart.UNDISPATCHED) {
          harness.factory.callbacks
            .single()
            .submit(paymentData())
        }
      val request = checkNotNull(CheckoutCoordinator.shared.activeRequest())
      assertEquals(operationId, request.operationId)
      harness.module.respond(response(request, """{"type":"retry","message":"Try again"}"""), PromiseRecorder())

      assertEquals(SubmitResult.Retry("Try again"), result.await())
      assertNull(CheckoutCoordinator.shared.activeOperationId())
      val again = PromiseRecorder().also { harness.module.submitController(checkoutId, controllerId, it) }
      assertTrue(again.resolved)
    }

  @Test
  fun `invalidation settles a suspended controller submit once and disposes the registry`() =
    runBlocking {
      val harness = Harness()
      val checkoutId = harness.setupAdvanced()
      val cardId = harness.regularIds(checkoutId).getValue("scheme")
      val controllerId = harness.createController(checkoutId, cardId).controllerId()

      val result =
        async(start = CoroutineStart.UNDISPATCHED) {
          harness.factory.callbacks
            .single()
            .submit(paymentData())
        }
      assertNotNull("the embedded callback claims the operation", CheckoutCoordinator.shared.activeRequest())
      val invalidated = PromiseRecorder().also { harness.module.invalidate(checkoutId, it) }

      assertTrue(invalidated.resolved)
      assertEquals(SubmitResult.Retry(null), result.await())
      assertNull(CheckoutCoordinator.shared.activeCheckoutId())
      assertEquals(0, CheckoutCoordinator.shared.controllerCount())
      assertEquals("staleCheckout", PromiseRecorder().also { harness.module.submitController(checkoutId, controllerId, it) }.code)
      assertEquals("staleCheckout", harness.isAvailable(checkoutId, cardId).code)
    }

  private fun assertUnsupportedPaymentMethod(promise: PromiseRecorder) {
    assertEquals("unsupportedCapability", promise.code)
    assertEquals("paymentMethod", promise.metadata?.getString("capability"))
    assertEquals("presentation", promise.metadata?.getString("phase"))
  }

  private fun assertUnsupportedAddressLookup(promise: PromiseRecorder) {
    assertEquals("unsupportedCapability", promise.code)
    assertEquals("Address lookup is unsupported by the pinned Android SDK", promise.message)
    assertEquals("addressLookup", promise.metadata?.getString("capability"))
    assertEquals("setup", promise.metadata?.getString("phase"))
  }

  private class Harness(
    val factory: ControllerFactory = ControllerFactory(),
  ) {
    val activity: FragmentActivity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    val events = mutableListOf<CoordinatorEvent>()
    val module: AndroidCheckoutModule

    init {
      val context = mainThreadContext()
      whenever(context.currentActivity).thenReturn(activity)
      module = AndroidCheckoutModule(context, { JavaOnlyMap() }, factory)
      CheckoutCoordinator.shared.configureRuntimeDependencies(
        CheckoutCoordinatorDependencies(
          checkoutFactory =
            object : CheckoutFactory {
              override fun create(): CoordinatorCheckout = error("Fixture setup supplies the checkout")
            },
          presenterFactory =
            object : PresenterFactory {
              override fun create(presentation: CoordinatorPresentation) = error("Controller submits must not allocate a presenter")
            },
          eventSink =
            object : CheckoutEventSink {
              override fun emit(event: CoordinatorEvent) {
                events += event
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
    }

    fun setupAdvanced(): String {
      val context = mock<CheckoutContext.Advanced>()
      whenever(context.paymentMethods).thenReturn(PaymentMethods.SERIALIZER.deserialize(JSONObject(PAYMENT_METHODS)))
      return CheckoutCoordinator.shared.setup { StateOwner(CheckoutState(context)) }
    }

    /** Ids as JavaScript receives them: read back from the published descriptor. */
    fun publishedRegular(checkoutId: String): List<Pair<String, String>> {
      val state = checkNotNull(CheckoutCoordinator.shared.checkoutState)
      val descriptor = module.checkoutDescriptor(checkoutId, state)
      assertEquals(checkoutId, descriptor.getString("checkoutId"))
      assertEquals("advanced", descriptor.getString("flow"))
      val regular = JSONObject(checkNotNull(descriptor.getString("paymentMethodsJson"))).getJSONArray("paymentMethods")
      return (0 until regular.length()).map { regular.getJSONObject(it).let { pm -> pm.getString("type") to pm.getString("id") } }
    }

    fun regularIds(checkoutId: String): Map<String, String> = publishedRegular(checkoutId).toMap()

    fun idsOfType(
      checkoutId: String,
      type: String,
    ): List<String> = publishedRegular(checkoutId).filter { it.first == type }.map { it.second }

    fun isAvailable(
      checkoutId: String,
      paymentMethodId: String,
    ): PromiseRecorder = PromiseRecorder().also { module.isAvailable(checkoutId, paymentMethodId, it) }

    fun createController(
      checkoutId: String,
      paymentMethodId: String,
    ): PromiseRecorder = PromiseRecorder().also { module.createController(checkoutId, paymentMethodId, it) }
  }

  /** SDK seam: builds a mock controller per target, or reports failure like the pinned SDK does. */
  private class ControllerFactory(
    private val failingTypes: Set<String> = emptySet(),
    private val headlessTypes: Set<String> = emptySet(),
  ) : NativeControllerFactory {
    val targets = mutableListOf<CheckoutTarget>()
    val controllers = mutableListOf<CheckoutController>()
    val callbacks = mutableListOf<CheckoutCallbacks>()

    override fun create(
      target: CheckoutTarget,
      context: CheckoutContext,
      callbacks: CheckoutCallbacks,
      coroutineScope: CoroutineScope,
    ): CheckoutController {
      targets += target
      val type = (target as? CheckoutTarget.PaymentMethod)?.type
      if (type in failingTypes) {
        // The pinned SDK's FailureCheckoutFlow reports onFailure synchronously during construction.
        callbacks.sdkField<(CheckoutError) -> Unit>("onFailure").invoke(mock())
        return mock()
      }
      this.callbacks += callbacks
      return mock<CheckoutController>().also { controller ->
        whenever(controller.requiresUserInteraction()).thenReturn(type !in headlessTypes)
        controllers += controller
      }
    }
  }

  private class StateOwner(
    override val checkoutState: CheckoutState,
  ) : CheckoutStateOwner {
    override fun dispose() = Unit
  }

  private class PromiseRecorder : Promise {
    var resolved = false
    var value: Any? = null
    var code: String? = null
    var message: String? = null
    var metadata: WritableMap? = null

    fun resolvedMap(): ReadableMap {
      assertNull("unexpected rejection $code", code)
      return value as ReadableMap
    }

    fun controllerId(): String = checkNotNull(resolvedMap().getString("controllerId"))

    override fun resolve(value: Any?) {
      resolved = true
      this.value = value
    }

    override fun reject(
      code: String?,
      message: String?,
    ) {
      this.code = code
      this.message = message
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
      this.message = message
      metadata = userInfo
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

  private companion object {
    const val PAYMENT_METHODS = """
      {
        "paymentMethods": [
          {"type": "scheme", "name": "Card", "brands": ["visa"]},
          {"type": "giftcard", "name": "Givex", "brand": "givex"},
          {"type": "giftcard", "name": "SVS", "brand": "svs"},
          {"type": "paypal", "name": "PayPal"}
        ]
      }
    """

    fun mainThreadContext(): ReactApplicationContext {
      val context = mock<ReactApplicationContext>()
      doAnswer { invocation ->
        (invocation.arguments[0] as Runnable).run()
        null
      }.whenever(context).runOnUiQueueThread(any())
      return context
    }

    fun paymentData(): PaymentComponentData<*> = PaymentComponentData(paymentMethod = null, order = null)

    fun response(
      request: com.adyenreactnativesdk.coordinator.CoordinatorRequest,
      payload: String,
    ): JavaOnlyMap =
      JavaOnlyMap().apply {
        putString("checkoutId", request.checkoutId)
        putString("operationId", request.operationId)
        putString("requestId", request.requestId)
        putString("kind", "advancedSubmit")
        putString("payloadJson", payload)
      }
  }
}

/** The SDK keeps its callback lambdas internal; tests invoke them as the SDK would. */
@Suppress("UNCHECKED_CAST")
internal fun <T> CheckoutCallbacks.sdkField(name: String): T =
  javaClass
    .getDeclaredField(name)
    .apply { isAccessible = true }
    .get(this) as T

@Suppress("UNCHECKED_CAST")
internal suspend fun CheckoutCallbacks.submit(data: PaymentComponentData<*>): SubmitResult =
  sdkField<suspend (PaymentComponentData<*>) -> SubmitResult>("onSubmit").invoke(data)
