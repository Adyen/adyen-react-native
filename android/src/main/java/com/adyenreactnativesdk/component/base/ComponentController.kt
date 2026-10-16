/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CoordinatorRequestKind
import com.adyenreactnativesdk.coordinator.RegisteredController
import org.json.JSONObject

/**
 * Registry-owned controller for one exact payment method instance. [ComponentManager] owns the
 * SDK controller, its suspended callbacks, and redirect registration; this class routes the
 * controller's callbacks to whichever operation currently owns it.
 */
internal class ComponentController private constructor(
  activity: FragmentActivity,
  checkoutId: String,
  sessionBeforeSubmitBridge: SessionBeforeSubmitBridge?,
  controllerFactory: NativeControllerFactory,
) : RegisteredController {
  private val eventSink: ControllerEventSink =
    ControllerEventSink(
      checkoutId = checkoutId,
      bindEmbeddedOperation = ::bindEmbeddedOperation,
      handleAction = { action -> manager.handleAction(action) },
      complete = { resultCode -> manager.completion(resultCode) },
      retry = { message -> manager.retry(message) },
    )
  private val manager: ComponentManager =
    ComponentManager(
      activity = activity,
      eventSink = eventSink,
      sessionBeforeSubmitBridge = sessionBeforeSubmitBridge,
      controllerFactory = controllerFactory,
    )

  override var requiresUserInteraction: Boolean = false
    private set

  override val checkoutController: CheckoutController?
    get() = manager.checkoutController

  override fun bindOperation(operationId: String) {
    eventSink.bindExplicitOperation(operationId)
  }

  override fun releaseOperation(operationId: String) {
    eventSink.releaseOperation(operationId)
  }

  override fun dispose() {
    manager.dispose()
  }

  private fun bindEmbeddedOperation(operationId: String) {
    manager.checkoutController?.let { controller ->
      CheckoutCoordinator.shared.registerRedirectController(controller, operationId)
    }
  }

  companion object {
    /** Returns null when the pinned SDK cannot build a component for [target]. */
    fun create(
      activity: FragmentActivity,
      checkoutId: String,
      state: CheckoutState,
      target: CheckoutTarget,
      controllerFactory: NativeControllerFactory = SdkControllerFactory,
    ): ComponentController? {
      val owner = ComponentController(activity, checkoutId, state.sessionBeforeSubmitBridge, controllerFactory)
      val controller = owner.manager.createController(state.checkoutContext, target) ?: return null
      owner.requiresUserInteraction = controller.requiresUserInteraction()
      return owner
    }
  }
}

/**
 * Routes one registry controller's SDK callbacks through the coordinator's operation slot and
 * generated event channel. An explicit submit binds its operation up front; otherwise the first
 * callback from a mounted controller claims an anonymous embedded operation.
 */
internal class ControllerEventSink(
  private val checkoutId: String,
  private val bindEmbeddedOperation: (String) -> Unit,
  private val handleAction: (Action) -> Unit,
  private val complete: (String) -> Unit,
  private val retry: (String?) -> Unit,
) : ComponentEventSink {
  private var ownsOperation = false
  private var isExplicit = false
  private var operationId: String? = null

  fun bindExplicitOperation(operationId: String) {
    this.operationId = operationId
    ownsOperation = true
    isExplicit = true
  }

  fun releaseOperation(operationId: String) {
    if (this.operationId != operationId) return
    this.operationId = null
    ownsOperation = false
    isExplicit = false
  }

  override fun onInteractionStarted(): Boolean {
    operationId?.let { operationId ->
      if (CheckoutCoordinator.shared.activeOperationId() == operationId) return true
    }
    isExplicit = false
    val acquiredOperationId = CheckoutCoordinator.shared.acquireEmbeddedOperation(checkoutId)
    ownsOperation = acquiredOperationId != null
    operationId = acquiredOperationId
    acquiredOperationId?.let(bindEmbeddedOperation)
    return ownsOperation
  }

  /**
   * A retry hands the shopper back to the form, so it ends the operation either way: embedded
   * retry releases the anonymous slot and an explicit submit completes, matching iOS.
   */
  private fun retryOperation(message: String?) {
    val activeOperationId = operationId
    val wasExplicit = isExplicit
    retry(message)
    if (activeOperationId == null) return
    if (wasExplicit) {
      CheckoutCoordinator.shared.completeOperation(activeOperationId)
    } else {
      CheckoutCoordinator.shared.releaseEmbeddedOperation(activeOperationId)
    }
    operationId = null
    ownsOperation = false
    isExplicit = false
  }

  override fun onAdvancedSubmit(data: PaymentComponentData<*>) {
    request(
      CoordinatorRequestKind.ADVANCED_SUBMIT,
      EVENT_ADVANCED_SUBMIT,
      PaymentComponentData.SERIALIZER.serialize(data),
    ) { response ->
      val payload = response?.let(::JSONObject) ?: JSONObject()
      when (payload.optString(TYPE)) {
        ACTION -> handleAction(Action.SERIALIZER.deserialize(payload.getJSONObject(ACTION)))
        COMPLETED -> complete(payload.optString(RESULT_CODE, CheckoutResultCode.ERROR.value))
        RETRY -> retryOperation(payload.optString(MESSAGE).takeIf(String::isNotBlank))
        else -> retryOperation(null)
      }
    }
  }

  override fun onAdvancedAdditionalDetails(data: ActionComponentData) {
    request(
      CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS,
      EVENT_ADVANCED_ADDITIONAL_DETAILS,
      ActionComponentData.SERIALIZER.serialize(data),
    ) { response ->
      complete(
        response?.let(::JSONObject)?.optString(RESULT_CODE, CheckoutResultCode.ERROR.value) ?: CheckoutResultCode.ERROR.value,
      )
    }
  }

  override fun onSessionComplete(result: SessionCheckoutResult) {
    terminal(
      EVENT_COMPLETION,
      JSONObject()
        .put(RESULT_CODE, result.resultCode.value)
        .put(SESSION_ID, result.sessionId)
        .put(SESSION_DATA, result.sessionData)
        .toString(),
    )
  }

  override fun onComplete(resultCode: String) {
    terminal(EVENT_COMPLETION, JSONObject().put(RESULT_CODE, resultCode).toString())
  }

  override fun onError() {
    terminal(
      EVENT_ERROR,
      JSONObject().put(ERROR_MESSAGE, "Checkout failed").put(ERROR_CODE, "checkoutFailed").toString(),
    )
  }

  private fun terminal(
    kind: String,
    payload: String,
  ) {
    if (!ownsOperation) return
    CheckoutCoordinator.shared.emitTerminal(
      checkoutId,
      kind,
      payload,
    )
    CheckoutCoordinator.shared.invalidate()
    operationId = null
    ownsOperation = false
    isExplicit = false
  }

  private fun request(
    kind: CoordinatorRequestKind,
    eventKind: String,
    payload: JSONObject,
    resume: (String?) -> Unit,
  ) {
    try {
      CheckoutCoordinator.shared.beginRequest(
        operationId = operationId ?: return resume(null),
        kind = kind,
        timeoutMillis = REQUEST_TIMEOUT_MILLIS,
        eventKind = eventKind,
        payloadJson = payload.toString(),
        cancellationFallback = { resume(null) },
        response = resume,
      )
    } catch (_: IllegalStateException) {
      resume(null)
    }
  }

  private companion object {
    const val TYPE = "type"
    const val ACTION = "action"
    const val COMPLETED = "completed"
    const val RETRY = "retry"
    const val MESSAGE = "message"
    const val RESULT_CODE = "resultCode"
    const val SESSION_ID = "sessionId"
    const val SESSION_DATA = "sessionData"
    const val ERROR_MESSAGE = "message"
    const val ERROR_CODE = "errorCode"
    const val EVENT_ADVANCED_SUBMIT = "advancedSubmit"
    const val EVENT_ADVANCED_ADDITIONAL_DETAILS = "advancedAdditionalDetails"
    const val EVENT_COMPLETION = "completion"
    const val EVENT_ERROR = "error"
    const val REQUEST_TIMEOUT_MILLIS = 60_000L
  }
}
