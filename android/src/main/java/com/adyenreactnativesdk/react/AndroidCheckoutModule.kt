/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import android.os.Handler
import android.os.Looper
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.sessions.SessionResponse
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentEventSink
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutCoordinatorDependencies
import com.adyenreactnativesdk.coordinator.CheckoutHostLauncherAdapter
import com.adyenreactnativesdk.coordinator.CheckoutIdentityGenerator
import com.adyenreactnativesdk.coordinator.CheckoutScheduler
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.coordinator.CoordinatorCancellation
import com.adyenreactnativesdk.coordinator.CoordinatorIdentityKind
import com.adyenreactnativesdk.coordinator.CoordinatorPresentation
import com.adyenreactnativesdk.coordinator.CoordinatorPresenter
import com.adyenreactnativesdk.coordinator.CoordinatorRequest
import com.adyenreactnativesdk.coordinator.CoordinatorRequestKind
import com.adyenreactnativesdk.coordinator.PresenterFactory
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

/**
 * Generated checkout control protocol. This is intentionally separate from the legacy event
 * modules: it owns the opaque checkout identity and emits typed, correlated bridge events.
 */
class AndroidCheckoutModule(
  private val reactContext: ReactApplicationContext,
  private val messageBus: MessageBus,
) : NativeAdyenCheckoutSpec(reactContext),
  LifecycleEventListener {
  /** Binds lifecycle callbacks from this TurboModule instance to its exact coordinator checkout. */
  private val lifecycleOwnerId = UUID.randomUUID().toString()
  private var pendingResponse: PendingResponse? = null

  init {
    reactContext.addLifecycleEventListener(this)
    CheckoutCoordinator.shared.configureRuntimeDependencies(
      CheckoutCoordinatorDependencies(
        checkoutFactory = UnsupportedCheckoutFactory,
        presenterFactory = HeadlessPresenterFactory(),
        eventSink =
          GeneratedCheckoutEventSink { event ->
            emitEvent(
              event.checkoutId,
              event.operationId,
              event.requestId,
              event.kind,
              event.payloadJson?.let(::JSONObject),
            )
          },
        identityGenerator = UUIDCoordinatorIdentityGenerator,
        scheduler = MainThreadCheckoutScheduler,
        hostLauncherAdapter = FragmentCheckoutHostAdapter(reactContext),
      ),
    )
  }

  override fun setSdkVersion(sdkVersion: String) {
    BaseModule.sdkVersion = sdkVersion
    BaseModule.configureAnalytics()
  }

  override fun setupSession(
    sessionJson: String,
    configurationJson: String,
    promise: Promise,
  ) {
    val session: SessionResponse
    val configuration =
      try {
        session = parseSession(sessionJson)
        CheckoutConfigurationFactory.get(ReactNativeJson.convertJsonToMap(JSONObject(configurationJson)))
      } catch (_: Exception) {
        reject(promise, ERROR_INVALID_CONFIGURATION)
        return
      }

    onMain {
      val activity = activityOrReject(promise) ?: return@onMain
      activity.lifecycleScope.launch {
        try {
          val checkoutId =
            CheckoutCoordinator.shared.setupAsync(ownerId = lifecycleOwnerId) {
              when (val result = Checkout.setup(session, configuration)) {
                is Checkout.Result.Success -> {
                  lateinit var beforeSubmitBridge: SessionBeforeSubmitBridge
                  beforeSubmitBridge =
                    SessionBeforeSubmitBridge(messageBus) { payload ->
                      createRequest(
                        operationId = CheckoutCoordinator.shared.activeOperationId() ?: return@SessionBeforeSubmitBridge,
                        kind = CoordinatorRequestKind.SESSION_BEFORE_SUBMIT,
                        eventKind = EVENT_SESSION_BEFORE_SUBMIT,
                        payload = payload,
                      ) { response ->
                        beforeSubmitBridge.provideJson(response ?: JSONObject().put(TYPE, ABORT))
                      }
                    }
                  TurboCheckoutFlow(CheckoutState(result.checkoutContext, beforeSubmitBridge))
                }

                is Checkout.Result.Error -> {
                  throw CheckoutSetupException
                }
              }
            }
          resolveDescriptor(promise, checkoutId)
        } catch (_: Exception) {
          reject(promise, ERROR_SETUP_FAILED)
        }
      }
    }
  }

  override fun setupAdvanced(
    paymentMethodsJson: String,
    configurationJson: String,
    promise: Promise,
  ) {
    val paymentMethods: PaymentMethods
    val configuration =
      try {
        paymentMethods = PaymentMethods.SERIALIZER.deserialize(JSONObject(paymentMethodsJson))
        CheckoutConfigurationFactory.get(ReactNativeJson.convertJsonToMap(JSONObject(configurationJson)))
      } catch (_: Exception) {
        reject(promise, ERROR_INVALID_CONFIGURATION)
        return
      }

    onMain {
      val activity = activityOrReject(promise) ?: return@onMain
      activity.lifecycleScope.launch {
        try {
          val checkoutId =
            CheckoutCoordinator.shared.setupAsync(ownerId = lifecycleOwnerId) {
              when (val result = Checkout.setup(paymentMethods, configuration)) {
                is Checkout.Result.Success -> TurboCheckoutFlow(CheckoutState(result.checkoutContext))
                is Checkout.Result.Error -> throw CheckoutSetupException
              }
            }
          resolveDescriptor(promise, checkoutId)
        } catch (_: Exception) {
          reject(promise, ERROR_SETUP_FAILED)
        }
      }
    }
  }

  override fun isAvailable(
    checkoutId: String,
    target: ReadableMap,
    promise: Promise,
  ) {
    onMain {
      val state = activeState(checkoutId, promise) ?: return@onMain
      val checkoutTarget = parseTarget(target, promise) ?: return@onMain
      if (!hasTarget(state.checkoutContext, checkoutTarget)) {
        reject(promise, ERROR_INVALID_TARGET)
        return@onMain
      }
      promise.resolve(hasTarget(state.checkoutContext, checkoutTarget))
    }
  }

  override fun requiresUserInteraction(
    checkoutId: String,
    target: ReadableMap,
    promise: Promise,
  ) {
    onMain {
      val activity = activityOrReject(promise) ?: return@onMain
      activity.lifecycleScope.launch {
        val state = activeState(checkoutId, promise) ?: return@launch
        val checkoutTarget = parseTarget(target, promise) ?: return@launch
        if (!hasTarget(state.checkoutContext, checkoutTarget)) {
          reject(promise, ERROR_INVALID_TARGET)
          return@launch
        }
        try {
          val requiresInteraction =
            CheckoutCoordinator.shared.withQueryPresenter { presenter ->
              presenter.createController(state.checkoutContext, checkoutTarget)?.requiresUserInteraction() == true
            }
          promise.resolve(requiresInteraction)
        } catch (_: Exception) {
          reject(promise, ERROR_QUERY_FAILED)
        }
      }
    }
  }

  override fun submit(
    checkoutId: String,
    target: ReadableMap,
    promise: Promise,
  ) {
    onMain {
      val activity = activityOrReject(promise) ?: return@onMain
      activity.lifecycleScope.launch {
        val state = activeState(checkoutId, promise) ?: return@launch
        val checkoutTarget = parseTarget(target, promise) ?: return@launch
        if (!hasTarget(state.checkoutContext, checkoutTarget)) {
          reject(promise, ERROR_INVALID_TARGET)
          return@launch
        }
        val operationId =
          try {
            CheckoutCoordinator.shared.beginOperation()
          } catch (_: Exception) {
            reject(promise, ERROR_OPERATION_BUSY)
            return@launch
          }
        val tag = "$FRAGMENT_TAG_PREFIX-$operationId"
        val presenter =
          CheckoutCoordinator.shared.presenter(operationId)
            ?: run {
              CheckoutCoordinator.shared.completeOperation(operationId)
              reject(promise, ERROR_SUBMIT_FAILED)
              return@launch
            }
        try {
          val controller = presenter.createController(state.checkoutContext, checkoutTarget)
          if (controller == null) {
            CheckoutCoordinator.shared.completeOperation(operationId)
            reject(promise, ERROR_INVALID_TARGET)
            return@launch
          }
          CheckoutFragment.show(
            fragmentManager = activity.supportFragmentManager,
            tag = tag,
            controllerProvider = { controller },
            autoSubmit = true,
            onCancelled = {
              clearPendingResponse(operationId)
              emitTerminal(checkoutId, EVENT_ERROR, terminalErrorPayload())
              if (CheckoutCoordinator.shared.activeOperationId() == operationId) {
                CheckoutCoordinator.shared.invalidate()
              }
            },
          )
          promise.resolve(null)
        } catch (_: Exception) {
          CheckoutCoordinator.shared.completeOperation(operationId)
          reject(promise, ERROR_SUBMIT_FAILED)
        }
      }
    }
  }

  override fun startDropIn(
    checkoutId: String,
    promise: Promise,
  ) {
    onMain {
      if (!CheckoutCoordinator.shared.isActive(checkoutId)) {
        reject(promise, ERROR_STALE_CHECKOUT)
        return@onMain
      }
      reject(promise, ERROR_DROP_IN_UNSUPPORTED)
    }
  }

  override fun respond(
    response: ReadableMap,
    promise: Promise,
  ) {
    onMain {
      val pending = pendingResponse
      if (pending == null || !pending.matches(response)) {
        reject(promise, ERROR_STALE_RESPONSE)
        return@onMain
      }
      val payload =
        try {
          response.getString(PAYLOAD_JSON)?.let(::JSONObject)
        } catch (_: Exception) {
          if (CheckoutCoordinator.shared.resolve(pending.request)) {
            pendingResponse = null
            pending.resume(null)
          }
          reject(promise, ERROR_INVALID_RESPONSE)
          return@onMain
        }
      if (
        pending.eventKind == EVENT_ADVANCED_SUBMIT &&
        (payload == null || !AdvancedSubmitResponseValidator.isValid(payload))
      ) {
        reject(promise, ERROR_INVALID_RESPONSE)
        return@onMain
      }
      if (!CheckoutCoordinator.shared.resolve(pending.request)) {
        reject(promise, ERROR_STALE_RESPONSE)
        return@onMain
      }
      pendingResponse = null
      pending.resume(payload)
      promise.resolve(null)
    }
  }

  override fun invalidate(
    checkoutId: String,
    promise: Promise,
  ) {
    onMain {
      if (!CheckoutCoordinator.shared.isActive(checkoutId)) {
        promise.resolve(null)
        return@onMain
      }
      pendingResponse = null
      CheckoutCoordinator.shared.invalidate()
      promise.resolve(null)
    }
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    pendingResponse = null
    CheckoutCoordinator.shared.hostDidDisappear(lifecycleOwnerId)
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
    onMain {
      pendingResponse = null
      CheckoutCoordinator.shared.hostDidDisappear(lifecycleOwnerId)
    }
    super.invalidate()
  }

  private fun activeState(
    checkoutId: String,
    promise: Promise,
  ): CheckoutState? {
    if (!CheckoutCoordinator.shared.isActive(checkoutId)) {
      reject(promise, ERROR_STALE_CHECKOUT)
      return null
    }
    return CheckoutCoordinator.shared.checkoutState
      ?: run {
        reject(promise, ERROR_STALE_CHECKOUT)
        null
      }
  }

  private fun parseTarget(
    source: ReadableMap,
    promise: Promise,
  ): CheckoutTarget? =
    when (source.getString(KIND)) {
      PAYMENT_METHOD -> {
        source.getString(TYPE)?.takeIf(String::isNotBlank)?.let(CheckoutTarget::PaymentMethod)
      }

      STORED_PAYMENT_METHOD -> {
        source.getString(ID)?.takeIf(String::isNotBlank)?.let(CheckoutTarget::StoredPaymentMethod)
      }

      else -> {
        null
      }
    } ?: run {
      reject(promise, ERROR_INVALID_TARGET)
      null
    }

  private fun hasTarget(
    context: CheckoutContext,
    target: CheckoutTarget,
  ): Boolean {
    val paymentMethods =
      when (context) {
        is CheckoutContext.Sessions -> context.checkoutSession.sessionSetupResponse.paymentMethods
        is CheckoutContext.Advanced -> context.paymentMethods
        else -> null
      }
    return when (target) {
      is CheckoutTarget.PaymentMethod -> paymentMethods?.paymentMethods?.any { it.type == target.type } == true
      is CheckoutTarget.StoredPaymentMethod -> paymentMethods?.storedPaymentMethods?.any { it.id == target.id } == true
      else -> false
    }
  }

  private fun resolveDescriptor(
    promise: Promise,
    checkoutId: String,
  ) {
    val state =
      CheckoutCoordinator.shared.checkoutState ?: run {
        reject(promise, ERROR_SETUP_FAILED)
        return
      }
    val context = state.checkoutContext
    val paymentMethods =
      when (context) {
        is CheckoutContext.Sessions -> context.checkoutSession.sessionSetupResponse.paymentMethods
        is CheckoutContext.Advanced -> context.paymentMethods
        else -> null
      }
    val descriptor =
      WritableNativeMap().apply {
        putString(CHECKOUT_ID, checkoutId)
        putString(FLOW, if (state.isSession) FLOW_SESSIONS else FLOW_ADVANCED)
        putString(PAYMENT_METHODS_JSON, PaymentMethods.SERIALIZER.serialize(paymentMethods ?: PaymentMethods()).toString())
      }
    promise.resolve(descriptor)
  }

  private fun componentEventSink(presentation: CoordinatorPresentation): ComponentEventSink =
    object : ComponentEventSink {
      override fun onAdvancedSubmit(data: PaymentComponentData<*>) {
        createRequest(
          presentation.operationId ?: return,
          CoordinatorRequestKind.ADVANCED_SUBMIT,
          EVENT_ADVANCED_SUBMIT,
          PaymentComponentData.SERIALIZER.serialize(data),
        ) { response ->
          val payload = response ?: JSONObject()
          when (payload.optString(TYPE)) {
            ACTION -> pendingPresenter(presentation)?.handleAction(Action.SERIALIZER.deserialize(payload.getJSONObject(ACTION)))
            COMPLETED -> pendingPresenter(presentation)?.complete(payload.optString(RESULT_CODE, CheckoutResultCode.ERROR.value))
            RETRY -> pendingPresenter(presentation)?.retry(payload.optString(MESSAGE).takeIf(String::isNotBlank))
            else -> pendingPresenter(presentation)?.retry(null)
          }
        }
      }

      override fun onAdvancedAdditionalDetails(data: ActionComponentData) {
        createRequest(
          presentation.operationId ?: return,
          CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS,
          EVENT_ADVANCED_ADDITIONAL_DETAILS,
          ActionComponentData.SERIALIZER.serialize(data),
        ) { response ->
          pendingPresenter(presentation)?.complete(
            response?.optString(RESULT_CODE, CheckoutResultCode.ERROR.value) ?: CheckoutResultCode.ERROR.value,
          )
        }
      }

      override fun onSessionComplete(result: SessionCheckoutResult) {
        emitTerminal(
          presentation.checkoutId,
          EVENT_COMPLETION,
          JSONObject()
            .put(RESULT_CODE, result.resultCode.value)
            .put(SESSION_ID, result.sessionId)
            .put(SESSION_DATA, result.sessionData),
        )
      }

      override fun onComplete(resultCode: String) {
        emitTerminal(presentation.checkoutId, EVENT_COMPLETION, JSONObject().put(RESULT_CODE, resultCode))
      }

      override fun onError() {
        emitTerminal(presentation.checkoutId, EVENT_ERROR, terminalErrorPayload())
      }
    }

  private fun pendingPresenter(presentation: CoordinatorPresentation): CoordinatorPresenter? =
    presentation.operationId?.let(CheckoutCoordinator.shared::presenter)

  /** A presenter may only clear the response its own operation created. */
  private fun clearPendingResponse(operationId: String) {
    if (pendingResponse?.request?.operationId == operationId) {
      pendingResponse = null
    }
  }

  private fun createRequest(
    operationId: String,
    kind: CoordinatorRequestKind,
    eventKind: String,
    payload: JSONObject,
    resume: (JSONObject?) -> Unit,
  ) {
    var requestId: String? = null
    val request =
      try {
        CheckoutCoordinator.shared.beginRequest(
          operationId = operationId,
          kind = kind,
          timeoutMillis = REQUEST_TIMEOUT_MILLIS,
          eventKind = eventKind,
          payloadJson = payload.toString(),
          cancellationFallback = {
            if (
              pendingResponse?.request?.operationId == operationId &&
              pendingResponse?.request?.requestId == requestId
            ) {
              pendingResponse = null
            }
            resume(null)
          },
        )
      } catch (_: Exception) {
        return
      }
    requestId = request.requestId
    pendingResponse = PendingResponse(request, eventKind, resume)
  }

  private fun emitTerminal(
    checkoutId: String,
    kind: String,
    payload: JSONObject? = null,
  ) = emitEvent(checkoutId, null, null, kind, payload)

  private fun emitEvent(
    checkoutId: String,
    operationId: String?,
    requestId: String?,
    kind: String,
    payload: JSONObject?,
  ) {
    emitOnCheckoutEvent(
      WritableNativeMap().apply {
        putString(CHECKOUT_ID, checkoutId)
        operationId?.let { putString(OPERATION_ID, it) }
        requestId?.let { putString(REQUEST_ID, it) }
        putString(KIND, kind)
        payload?.let { putString(PAYLOAD_JSON, it.toString()) }
      },
    )
  }

  private fun terminalErrorPayload(): JSONObject =
    JSONObject()
      .put(ERROR_MESSAGE, "Checkout failed")
      .put(ERROR_CODE, "checkoutFailed")

  private fun parseSession(json: String): SessionResponse {
    val source = JSONObject(json)
    val id = source.optString(ID)
    val sessionData = source.optString(SESSION_DATA).takeIf(String::isNotBlank)
    require(id.isNotBlank() && sessionData != null)
    return SessionResponse(id, sessionData)
  }

  private fun activityOrReject(promise: Promise): FragmentActivity? =
    (reactContext.currentActivity as? FragmentActivity)
      ?: run {
        reject(promise, ERROR_NO_ACTIVITY)
        null
      }

  private fun reject(
    promise: Promise,
    code: String,
  ) {
    promise.reject(code, code)
  }

  private fun onMain(action: () -> Unit) {
    reactContext.runOnUiQueueThread(action)
  }

  private data class PendingResponse(
    val request: CoordinatorRequest,
    val eventKind: String,
    val resume: (JSONObject?) -> Unit,
  ) {
    fun matches(response: ReadableMap): Boolean =
      response.getString(CHECKOUT_ID) == request.checkoutId &&
        response.getString(OPERATION_ID) == request.operationId &&
        response.getString(REQUEST_ID) == request.requestId &&
        response.getString(KIND) == eventKind
  }

  private class TurboCheckoutFlow(
    override val checkoutState: CheckoutState,
  ) : CheckoutStateOwner {
    override fun dispose() {
      checkoutState.sessionBeforeSubmitBridge?.cancel()
    }
  }

  private object UnsupportedCheckoutFactory : com.adyenreactnativesdk.coordinator.CheckoutFactory {
    override fun create(): com.adyenreactnativesdk.coordinator.CoordinatorCheckout =
      error("AndroidCheckoutModule supplies setup candidates directly")
  }

  private inner class HeadlessPresenterFactory : PresenterFactory {
    override fun create(presentation: CoordinatorPresentation): CoordinatorPresenter = HeadlessCoordinatorPresenter(presentation)
  }

  /**
   * Owns the controller for one headless operation or a temporary query. The coordinator creates
   * and disposes this presenter, so production code never builds an untracked controller.
   */
  private inner class HeadlessCoordinatorPresenter(
    private val presentation: CoordinatorPresentation,
  ) : CoordinatorPresenter {
    private var manager: ComponentManager? = null

    override suspend fun createController(
      context: CheckoutContext,
      target: CheckoutTarget,
    ): com.adyen.checkout.core.components.CheckoutController? {
      check(manager == null) { "Presenter controller is already created" }
      val createdManager =
        ComponentManager(
          activity = activityOrThrow(),
          messageBus = messageBus,
          sessionBeforeSubmitBridge = CheckoutCoordinator.shared.checkoutState?.sessionBeforeSubmitBridge,
          eventSink = componentEventSink(presentation),
          onTerminal =
            presentation.operationId?.let { operationId ->
              {
                clearPendingResponse(operationId)
                if (CheckoutCoordinator.shared.activeOperationId() == operationId) {
                  CheckoutFragment.hide(
                    activityOrThrow().supportFragmentManager,
                    "$FRAGMENT_TAG_PREFIX-$operationId",
                  )
                  CheckoutCoordinator.shared.invalidate()
                }
              }
            },
        )
      manager = createdManager
      return createdManager.createController(context, target)
    }

    override fun handleAction(action: Action) {
      manager?.handleAction(action)
    }

    override fun complete(resultCode: String) {
      manager?.completion(resultCode)
    }

    override fun retry(message: String?) {
      manager?.retry(message)
    }

    override fun dispose() {
      manager?.dispose()
      manager = null
    }

    private fun activityOrThrow(): FragmentActivity =
      reactContext.currentActivity as? FragmentActivity
        ?: error("Headless presenter requires an active FragmentActivity")
  }

  private object UUIDCoordinatorIdentityGenerator : CheckoutIdentityGenerator {
    override fun next(kind: CoordinatorIdentityKind): String =
      java.util.UUID
        .randomUUID()
        .toString()
  }

  private object MainThreadCheckoutScheduler : CheckoutScheduler {
    private val handler = Handler(Looper.getMainLooper())

    override fun schedule(
      delayMillis: Long,
      action: () -> Unit,
    ): CoordinatorCancellation {
      val runnable = Runnable(action)
      handler.postDelayed(runnable, delayMillis)
      return object : CoordinatorCancellation {
        override fun cancel() {
          handler.removeCallbacks(runnable)
        }
      }
    }
  }

  private class FragmentCheckoutHostAdapter(
    private val reactContext: ReactApplicationContext,
  ) : CheckoutHostLauncherAdapter {
    override fun releaseCheckoutHost() {
      val activity = reactContext.currentActivity as? FragmentActivity ?: return
      val operationId = CheckoutCoordinator.shared.activeOperationId() ?: return
      CheckoutFragment.hide(activity.supportFragmentManager, "$FRAGMENT_TAG_PREFIX-$operationId")
    }
  }

  private object CheckoutSetupException : IllegalStateException()

  companion object {
    const val NAME = NativeAdyenCheckoutSpec.NAME

    private const val CHECKOUT_ID = "checkoutId"
    private const val OPERATION_ID = "operationId"
    private const val REQUEST_ID = "requestId"
    private const val KIND = "kind"
    private const val PAYLOAD_JSON = "payloadJson"
    private const val PAYMENT_METHODS_JSON = "paymentMethodsJson"
    private const val FLOW = "flow"
    private const val FLOW_SESSIONS = "sessions"
    private const val FLOW_ADVANCED = "advanced"
    private const val PAYMENT_METHOD = "paymentMethod"
    private const val STORED_PAYMENT_METHOD = "storedPaymentMethod"
    private const val TYPE = "type"
    private const val ID = "id"
    private const val ACTION = "action"
    private const val COMPLETED = "completed"
    private const val RETRY = "retry"
    private const val MESSAGE = "message"
    private const val ERROR_MESSAGE = "message"
    private const val ERROR_CODE = "errorCode"
    private const val RESULT_CODE = "resultCode"
    private const val SESSION_ID = "sessionId"
    private const val SESSION_DATA = "sessionData"
    private const val ABORT = "abort"
    private const val EVENT_ADVANCED_SUBMIT = "advancedSubmit"
    private const val EVENT_ADVANCED_ADDITIONAL_DETAILS = "advancedAdditionalDetails"
    private const val EVENT_SESSION_BEFORE_SUBMIT = "sessionBeforeSubmit"
    private const val EVENT_COMPLETION = "completion"
    private const val EVENT_ERROR = "error"
    private const val FRAGMENT_TAG_PREFIX = "TurboCheckout"
    private const val REQUEST_TIMEOUT_MILLIS = 60_000L
    private const val ERROR_INVALID_CONFIGURATION = "invalidConfiguration"
    private const val ERROR_SETUP_FAILED = "invalidConfiguration"
    private const val ERROR_STALE_CHECKOUT = "staleCheckout"
    private const val ERROR_INVALID_TARGET = "invalidTarget"
    private const val ERROR_QUERY_FAILED = "invalidTarget"
    private const val ERROR_OPERATION_BUSY = "operationBusy"
    private const val ERROR_SUBMIT_FAILED = "cancelled"
    private const val ERROR_DROP_IN_UNSUPPORTED = "unsupportedCapability"
    private const val ERROR_STALE_RESPONSE = "staleRequest"
    private const val ERROR_INVALID_RESPONSE = "staleRequest"
    private const val ERROR_NO_ACTIVITY = "cancelled"
  }
}
