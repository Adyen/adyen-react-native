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
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import com.adyen.checkout.core.sessions.SessionResponse
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.component.base.ComponentController
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.NativeControllerFactory
import com.adyenreactnativesdk.component.base.SdkControllerFactory
import com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutCoordinatorDependencies
import com.adyenreactnativesdk.coordinator.CheckoutHostLauncherAdapter
import com.adyenreactnativesdk.coordinator.CheckoutIdentityGenerator
import com.adyenreactnativesdk.coordinator.CheckoutScheduler
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.coordinator.ControllerRegistration
import com.adyenreactnativesdk.coordinator.CoordinatorCancellation
import com.adyenreactnativesdk.coordinator.CoordinatorDropInPresenter
import com.adyenreactnativesdk.coordinator.CoordinatorDropInResult
import com.adyenreactnativesdk.coordinator.CoordinatorIdentityKind
import com.adyenreactnativesdk.coordinator.CoordinatorPresentation
import com.adyenreactnativesdk.coordinator.CoordinatorPresenter
import com.adyenreactnativesdk.coordinator.CoordinatorRequestKind
import com.adyenreactnativesdk.coordinator.OperationBusyException
import com.adyenreactnativesdk.coordinator.PresenterFactory
import com.adyenreactnativesdk.coordinator.StaleCheckoutException
import com.adyenreactnativesdk.coordinator.UnknownControllerException
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

/**
 * Generated checkout control protocol. Owns the opaque checkout identity and emits typed, correlated bridge events.
 */
class AndroidCheckoutModule internal constructor(
  private val reactContext: ReactApplicationContext,
  private val mapFactory: () -> WritableMap,
  private val controllerFactory: NativeControllerFactory,
) : NativeAdyenCheckoutSpec(reactContext),
  LifecycleEventListener {
  constructor(reactContext: ReactApplicationContext) : this(reactContext, ::WritableNativeMap, SdkControllerFactory)

  /** Binds lifecycle callbacks from this TurboModule instance to its exact coordinator checkout. */
  internal val lifecycleOwnerId = UUID.randomUUID().toString()

  init {
    reactContext.addLifecycleEventListener(this)
    onMain {
      CheckoutCoordinator.shared.configureRuntimeDependencies(
        CheckoutCoordinatorDependencies(
          checkoutFactory = UnsupportedCheckoutFactory,
          presenterFactory = DropInPresenterFactory(),
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
  }

  override fun setSdkVersion(sdkVersion: String) {
    AdyenPaymentPackage.sdkVersion = sdkVersion
    AdyenPaymentPackage.configureAnalytics()
  }

  override fun setupSession(
    sessionJson: String,
    configurationJson: String,
    promise: Promise,
  ) {
    if (usesUnsupportedAddressLookup(configurationJson)) {
      rejectUnsupportedAddressLookup(promise)
      return
    }
    val session: SessionResponse
    val configuration =
      try {
        session = parseSession(sessionJson)
        CheckoutConfigurationFactory.get(ReactNativeJson.convertJsonToMap(JSONObject(configurationJson)))
      } catch (_: ModuleException.UnsupportedAddressLookup) {
        rejectUnsupportedAddressLookup(promise)
        return
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
                    SessionBeforeSubmitBridge { payload ->
                      SessionBeforeSubmitCallbackRouter.route(beforeSubmitBridge, payload)
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
    if (usesUnsupportedAddressLookup(configurationJson)) {
      rejectUnsupportedAddressLookup(promise)
      return
    }
    val paymentMethods: PaymentMethods
    val configuration =
      try {
        paymentMethods = PaymentMethods.SERIALIZER.deserialize(JSONObject(paymentMethodsJson))
        CheckoutConfigurationFactory.get(ReactNativeJson.convertJsonToMap(JSONObject(configurationJson)))
      } catch (_: ModuleException.UnsupportedAddressLookup) {
        rejectUnsupportedAddressLookup(promise)
        return
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
    paymentMethodId: String,
    promise: Promise,
  ) {
    onMain {
      val registration = resolveController(checkoutId, paymentMethodId, promise) ?: return@onMain
      promise.resolve(registration.isPresent)
    }
  }

  override fun createController(
    checkoutId: String,
    paymentMethodId: String,
    promise: Promise,
  ) {
    onMain {
      val registration = resolveController(checkoutId, paymentMethodId, promise) ?: return@onMain
      val controller =
        registration.orNull() ?: run {
          rejectUnsupportedPaymentMethod(promise)
          return@onMain
        }
      promise.resolve(
        mapFactory().apply {
          putString(CONTROLLER_ID, controller.controllerId)
          putBoolean(REQUIRES_USER_INTERACTION, controller.requiresUserInteraction)
        },
      )
    }
  }

  /**
   * Submits with the EXISTING registry controller. A controller rendered by a mounted view
   * submits in place; otherwise the bottom sheet hosts the same controller so input or actions
   * can surface, and auto-submits when no input is required.
   */
  override fun submitController(
    checkoutId: String,
    controllerId: String,
    promise: Promise,
  ) {
    onMain {
      activeState(checkoutId, promise) ?: return@onMain
      val activity = activityOrReject(promise) ?: return@onMain
      val operationId =
        try {
          CheckoutCoordinator.shared.beginControllerOperation(checkoutId, controllerId)
        } catch (_: StaleCheckoutException) {
          reject(promise, ERROR_STALE_CHECKOUT)
          return@onMain
        } catch (_: UnknownControllerException) {
          reject(promise, ERROR_INVALID_TARGET)
          return@onMain
        } catch (_: OperationBusyException) {
          reject(promise, ERROR_OPERATION_BUSY)
          return@onMain
        } catch (_: Exception) {
          reject(promise, ERROR_SUBMIT_FAILED)
          return@onMain
        }
      try {
        val controller = CheckoutCoordinator.shared.fragmentController(operationId)
        if (controller == null) {
          CheckoutCoordinator.shared.completeOperation(operationId)
          reject(promise, ERROR_SUBMIT_FAILED)
          return@onMain
        }
        if (CheckoutCoordinator.shared.isControllerBound(controllerId)) {
          controller.submit()
        } else {
          CheckoutFragment.showCoordinator(
            fragmentManager = activity.supportFragmentManager,
            operationId = operationId,
            autoSubmit = true,
            onCancelled = {
              CheckoutCoordinator.shared.terminateOperation(checkoutId, operationId, EVENT_ERROR, terminalErrorPayload().toString())
            },
          )
        }
        promise.resolve(null)
      } catch (_: Exception) {
        CheckoutCoordinator.shared.completeOperation(operationId)
        reject(promise, ERROR_SUBMIT_FAILED)
      }
    }
  }

  override fun startDropIn(
    checkoutId: String,
    promise: Promise,
  ) {
    onMain {
      val state = activeState(checkoutId, promise) ?: return@onMain
      if (!state.isSession) {
        // TODO(Adyen Android SDK future published version): enable advanced Drop-in when its
        // callback construction exposes the completion hook that emits DropInResult.Completed.
        rejectUnsupportedAdvancedDropIn(promise)
        return@onMain
      }
      activityOrReject(promise) ?: return@onMain
      try {
        CheckoutCoordinator.shared.beginDropIn(state.checkoutContext)
        promise.resolve(null)
      } catch (_: OperationBusyException) {
        reject(promise, ERROR_OPERATION_BUSY)
      } catch (_: Exception) {
        reject(promise, ERROR_DROP_IN_FAILED)
      }
    }
  }

  override fun respond(
    response: ReadableMap,
    promise: Promise,
  ) {
    onMain {
      val request = CheckoutCoordinator.shared.activeRequest()
      if (
        request == null ||
        response.getString(CHECKOUT_ID) != request.checkoutId ||
        response.getString(OPERATION_ID) != request.operationId ||
        response.getString(REQUEST_ID) != request.requestId ||
        response.getString(KIND) != CheckoutCoordinator.shared.activeRequestEventKind()
      ) {
        reject(promise, ERROR_STALE_RESPONSE)
        return@onMain
      }
      val payload =
        try {
          response.getString(PAYLOAD_JSON)?.let(::JSONObject)
        } catch (_: Exception) {
          CheckoutCoordinator.shared.resolve(request)
          reject(promise, ERROR_INVALID_RESPONSE)
          return@onMain
        }
      if (
        CheckoutCoordinator.shared.activeRequestEventKind() == EVENT_ADVANCED_SUBMIT &&
        (payload == null || !AdvancedSubmitResponseValidator.isValid(payload))
      ) {
        reject(promise, ERROR_INVALID_RESPONSE)
        return@onMain
      }
      if (!CheckoutCoordinator.shared.resolve(request, payload?.toString())) {
        reject(promise, ERROR_STALE_RESPONSE)
        return@onMain
      }
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
      CheckoutCoordinator.shared.invalidate()
      promise.resolve(null)
    }
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    CheckoutCoordinator.shared.hostDidDisappear(lifecycleOwnerId)
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
    onMain {
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

  /**
   * Resolves [paymentMethodId] to its registry controller, eagerly creating it for the exact
   * instance. Rejects (and returns null) for stale checkouts and foreign ids; a present but
   * non-creatable payment method yields [ControllerLookup.Unavailable].
   */
  private fun resolveController(
    checkoutId: String,
    paymentMethodId: String,
    promise: Promise,
  ): ControllerLookup? {
    val state = activeState(checkoutId, promise) ?: return null
    val paymentMethod =
      state.paymentMethods.paymentMethod(paymentMethodId) ?: run {
        reject(promise, ERROR_INVALID_TARGET)
        return null
      }
    val activity = activityOrReject(promise) ?: return null
    return try {
      val registration =
        CheckoutCoordinator.shared.registerController(checkoutId, paymentMethodId) {
          state.paymentMethods.exactTarget(paymentMethod)?.let { target ->
            ComponentController.create(activity, checkoutId, state, target, controllerFactory)
          }
        }
      registration?.let(ControllerLookup::Available) ?: ControllerLookup.Unavailable
    } catch (_: StaleCheckoutException) {
      reject(promise, ERROR_STALE_CHECKOUT)
      null
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
    promise.resolve(checkoutDescriptor(checkoutId, state))
  }

  /** The published snapshot carries the ids minted by the checkout's [CheckoutState.paymentMethods]. */
  internal fun checkoutDescriptor(
    checkoutId: String,
    state: CheckoutState,
  ): WritableMap =
    mapFactory().apply {
      putString(CHECKOUT_ID, checkoutId)
      putString(FLOW, if (state.isSession) FLOW_SESSIONS else FLOW_ADVANCED)
      putString(PAYMENT_METHODS_JSON, state.paymentMethods.paymentMethodsJson.toString())
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

  private fun terminalErrorPayload(message: String = "Checkout failed"): JSONObject =
    JSONObject()
      .put(ERROR_MESSAGE, message)
      .put(ERROR_CODE, "checkoutFailed")

  private fun parseSession(json: String): SessionResponse {
    val source = JSONObject(json)
    val id = source.optString(ID)
    val sessionData = source.optString(SESSION_DATA).takeIf(String::isNotBlank)
    require(id.isNotBlank() && sessionData != null)
    return SessionResponse(id, sessionData)
  }

  /**
   * Reject lookup at the bridge boundary before a [CheckoutConfiguration] or controller can be
   * created. CardConfigurationParser repeats the guard for all other Android callers.
   */
  private fun usesUnsupportedAddressLookup(configurationJson: String): Boolean =
    try {
      val configuration = JSONObject(configurationJson)
      val cardConfiguration = configuration.optJSONObject(CARD) ?: configuration
      cardConfiguration.optString(ADDRESS_VISIBILITY).equals(ADDRESS_LOOKUP, ignoreCase = true)
    } catch (_: Exception) {
      false
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

  private fun rejectUnsupportedAddressLookup(promise: Promise) {
    promise.reject(
      ERROR_UNSUPPORTED_CAPABILITY,
      "Address lookup is unsupported by the pinned Android SDK",
      mapFactory().apply {
        putString(CAPABILITY, ADDRESS_LOOKUP_CAPABILITY)
        putString(PHASE, PHASE_SETUP)
      },
    )
  }

  private fun rejectUnsupportedAdvancedDropIn(promise: Promise) {
    promise.reject(
      ERROR_UNSUPPORTED_CAPABILITY,
      "Advanced Drop-in is unsupported by Android SDK 6.0.0-alpha.1",
      mapFactory().apply {
        putString(CAPABILITY, ADVANCED_DROP_IN_CAPABILITY)
        putString(PHASE, PHASE_PRESENTATION)
      },
    )
  }

  private fun rejectUnsupportedPaymentMethod(promise: Promise) {
    promise.reject(
      ERROR_UNSUPPORTED_CAPABILITY,
      "Payment method has no native component on the pinned Android SDK",
      mapFactory().apply {
        putString(CAPABILITY, PAYMENT_METHOD_CAPABILITY)
        putString(PHASE, PHASE_PRESENTATION)
      },
    )
  }

  private fun onMain(action: () -> Unit) {
    reactContext.runOnUiQueueThread(action)
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

  private inner class DropInPresenterFactory : PresenterFactory {
    override fun create(presentation: CoordinatorPresentation): CoordinatorPresenter {
      check(presentation.isDropIn) { "Explicit operations borrow a registry controller" }
      return DropInCoordinatorPresenter(presentation)
    }
  }

  /**
   * Official Drop-in service callbacks share the coordinator request broker. The presenter never
   * reconstructs configuration or payment methods because the launcher receives CheckoutContext.
   */
  private inner class DropInCoordinatorPresenter(
    private val presentation: CoordinatorPresentation,
  ) : CoordinatorPresenter,
    CoordinatorDropInPresenter {
    private var disposed = false

    override fun onDropInResult(result: CoordinatorDropInResult) {
      if (disposed) return
      when (result) {
        is CoordinatorDropInResult.Completed -> {
          val state = CheckoutCoordinator.shared.checkoutState ?: return
          val payload =
            if (state.isSession) {
              val session = (state.checkoutContext as CheckoutContext.Sessions).checkoutSession.sessionSetupResponse
              JSONObject()
                .put(RESULT_CODE, result.resultCode)
                .put(SESSION_ID, session.id)
                .put(SESSION_DATA, session.sessionData)
            } else {
              JSONObject().put(RESULT_CODE, result.resultCode)
            }
          emitTerminal(presentation.checkoutId, EVENT_COMPLETION, payload)
        }

        CoordinatorDropInResult.Cancelled -> {
          emitTerminal(presentation.checkoutId, EVENT_ERROR, terminalErrorPayload("Drop-in cancelled"))
        }

        is CoordinatorDropInResult.Failed -> {
          emitTerminal(presentation.checkoutId, EVENT_ERROR, terminalErrorPayload(result.message))
        }
      }
    }

    override fun dispose() {
      disposed = true
    }
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

  internal class FragmentCheckoutHostAdapter(
    private val reactContext: ReactApplicationContext,
  ) : CheckoutHostLauncherAdapter {
    override fun releaseCheckoutHost() {
      val activity = reactContext.currentActivity as? FragmentActivity ?: return
      val operationId = CheckoutCoordinator.shared.activeOperationId() ?: return
      CheckoutFragment.hide(
        activity.supportFragmentManager,
        "${CheckoutFragment.COORDINATOR_TAG_PREFIX}-$operationId",
      )
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
    private const val CONTROLLER_ID = "controllerId"
    private const val REQUIRES_USER_INTERACTION = "requiresUserInteraction"
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
    private const val EVENT_ADVANCED_SUBMIT = "advancedSubmit"
    private const val EVENT_ADVANCED_ADDITIONAL_DETAILS = "advancedAdditionalDetails"
    private const val EVENT_COMPLETION = "completion"
    private const val EVENT_ERROR = "error"
    private const val REQUEST_TIMEOUT_MILLIS = 60_000L
    private const val ERROR_INVALID_CONFIGURATION = "invalidConfiguration"
    private const val ERROR_SETUP_FAILED = "invalidConfiguration"
    private const val ERROR_STALE_CHECKOUT = "staleCheckout"
    private const val ERROR_INVALID_TARGET = "invalidTarget"
    private const val ERROR_OPERATION_BUSY = "operationBusy"
    private const val ERROR_SUBMIT_FAILED = "cancelled"
    private const val ERROR_DROP_IN_FAILED = "cancelled"
    private const val ERROR_STALE_RESPONSE = "staleRequest"
    private const val ERROR_INVALID_RESPONSE = "staleRequest"
    private const val ERROR_NO_ACTIVITY = "cancelled"
    private const val ERROR_UNSUPPORTED_CAPABILITY = "unsupportedCapability"
    private const val CAPABILITY = "capability"
    private const val ADDRESS_LOOKUP_CAPABILITY = "addressLookup"
    private const val ADVANCED_DROP_IN_CAPABILITY = "advancedDropIn"
    private const val PAYMENT_METHOD_CAPABILITY = "paymentMethod"
    private const val PHASE = "phase"
    private const val PHASE_SETUP = "setup"
    private const val PHASE_PRESENTATION = "presentation"
    private const val CARD = "card"
    private const val ADDRESS_VISIBILITY = "addressVisibility"
    private const val ADDRESS_LOOKUP = "lookup"
  }
}

/**
 * Production callback router for a sessions before-submit callback. The request is created from
 * the active anonymous embedded operation, and a missing, stale, or malformed response aborts.
 */
internal object SessionBeforeSubmitCallbackRouter {
  fun route(
    bridge: SessionBeforeSubmitBridge,
    payload: JSONObject,
  ) {
    val operationId = CheckoutCoordinator.shared.activeOperationId()
    if (operationId == null) {
      bridge.provideJson(abort())
      return
    }
    try {
      CheckoutCoordinator.shared.beginRequest(
        operationId = operationId,
        kind = CoordinatorRequestKind.SESSION_BEFORE_SUBMIT,
        timeoutMillis = REQUEST_TIMEOUT_MILLIS,
        eventKind = EVENT_SESSION_BEFORE_SUBMIT,
        payloadJson = payload.toString(),
        cancellationFallback = { bridge.provideJson(abort()) },
        response = { response -> bridge.provideJson(response?.let(::JSONObject) ?: abort()) },
      )
    } catch (_: IllegalStateException) {
      bridge.provideJson(abort())
    }
  }

  private fun abort(): JSONObject = JSONObject().put(TYPE, ABORT)

  private const val TYPE = "type"
  private const val ABORT = "abort"
  private const val EVENT_SESSION_BEFORE_SUBMIT = "sessionBeforeSubmit"
  private const val REQUEST_TIMEOUT_MILLIS = 60_000L
}

/** Outcome of resolving a known payment method id to its registry controller. */
private sealed interface ControllerLookup {
  val isPresent: Boolean

  fun orNull(): ControllerRegistration? = (this as? Available)?.registration

  data class Available(
    val registration: ControllerRegistration,
  ) : ControllerLookup {
    override val isPresent: Boolean = true
  }

  data object Unavailable : ControllerLookup {
    override val isPresent: Boolean = false
  }
}
