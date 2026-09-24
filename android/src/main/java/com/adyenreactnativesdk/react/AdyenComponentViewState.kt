/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import android.util.Log
import android.util.Size
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutPaymentFlow
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyenreactnativesdk.component.base.ComponentEventSink
import com.adyenreactnativesdk.component.base.ComponentManager
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CoordinatorPresenter
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.react.base.LayoutChangeEvent
import com.adyenreactnativesdk.react.base.LayoutListener
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import kotlinx.coroutines.launch
import org.json.JSONObject

private const val TAG = "AdyenComponentViewState"

/**
 * Per-view state for one identity-bound Fabric registration. The checkout coordinator owns the
 * registration; this state owns only its local Compose tree and a presenter proxy.
 */
class AdyenComponentViewState(
  private val context: ThemedReactContext,
) : LayoutListener {
  var checkoutId: String? = null
  var presenterId: String? = null
  var targetKind: String? = "paymentMethod"
  var targetValue: String? = null

  private var registration: FabricCoordinatorPresenter? = null
  private var creationGeneration = 0

  /** Applies the complete Fabric tuple atomically after all prop setters have run. */
  fun updateRegistration(view: DynamicComponentView) {
    val checkoutId = checkoutId
    val presenterId = presenterId
    val target = target()
    val activity = context.currentActivity as? FragmentActivity
    val checkoutContext = CheckoutCoordinator.shared.checkoutState?.checkoutContext
    if (checkoutId.isNullOrBlank() || presenterId.isNullOrBlank() || target == null || activity == null || checkoutContext == null) {
      dispose(view)
      return
    }

    val current = registration
    if (current?.matches(checkoutId, presenterId, target) == true) return

    dispose(view)
    val presenter =
      FabricCoordinatorPresenter(
        activity = activity,
        checkoutId = checkoutId,
        presenterId = presenterId,
        target = target,
        sessionBeforeSubmitBridge = CheckoutCoordinator.shared.checkoutState?.sessionBeforeSubmitBridge,
      )
    try {
      CheckoutCoordinator.shared.registerPassivePresenter(checkoutId, presenterId, presenter)
    } catch (exception: IllegalStateException) {
      Log.w(TAG, "Embedded registration is stale or collides with a live presenter", exception)
      presenter.dispose()
      return
    }

    registration = presenter
    creationGeneration += 1
    val generation = creationGeneration
    val composeView =
      ComposeView(activity).apply {
        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindowOrReleasedFromPool)
      }
    view.setView(composeView)

    activity.lifecycleScope.launch {
      val controller = presenter.createController(checkoutContext, target)
      if (
        controller == null ||
        registration !== presenter ||
        creationGeneration != generation ||
        !CheckoutCoordinator.shared.isPassivePresenterActive(checkoutId, presenterId, presenter)
      ) {
        presenter.dispose()
        return@launch
      }
      composeView.setContent {
        CheckoutPaymentFlow(controller = controller)
      }
    }
  }

  override fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  ) {
    val surfaceId = UIManagerHelper.getSurfaceId(context)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, viewId)
    eventDispatcher?.dispatchEvent(LayoutChangeEvent(surfaceId, viewId, size.width, size.height))
  }

  fun dispose(view: DynamicComponentView) {
    creationGeneration += 1
    view.onDispose()
    val current = registration
    registration = null
    current?.dispose()
  }

  private fun target(): CheckoutTarget? =
    when (targetKind) {
      "paymentMethod" -> targetValue?.takeIf(String::isNotBlank)?.let(CheckoutTarget::PaymentMethod)
      "storedPaymentMethod" -> targetValue?.takeIf(String::isNotBlank)?.let(CheckoutTarget::StoredPaymentMethod)
      else -> null
    }
}

/**
 * Coordinator-owned passive presenter for one Fabric registration. Its manager, controller,
 * redirect route, and cancellation state cannot outlive the exact checkout/presenter tuple.
 */
private class FabricCoordinatorPresenter(
  private val activity: FragmentActivity,
  private val checkoutId: String,
  private val presenterId: String,
  private val target: CheckoutTarget,
  sessionBeforeSubmitBridge: com.adyenreactnativesdk.component.base.SessionBeforeSubmitBridge?,
) : CoordinatorPresenter {
  private val manager =
    ComponentManager(
      activity = activity,
      messageBus = null,
      additionalCallbacks = null,
      additionalSessionCallbacks = null,
      sessionBeforeSubmitBridge = sessionBeforeSubmitBridge,
      eventSink = FabricComponentEventSink(checkoutId, presenterId, this),
      redirectOwnerId = presenterId,
      onTerminal = {
        if (CheckoutCoordinator.shared.activeOperationId() == presenterId) {
          CheckoutCoordinator.shared.invalidate()
        }
      },
    )
  private var disposed = false

  fun matches(
    checkoutId: String,
    presenterId: String,
    target: CheckoutTarget,
  ): Boolean = this.checkoutId == checkoutId && this.presenterId == presenterId && this.target == target

  override suspend fun createController(
    context: CheckoutContext,
    target: CheckoutTarget,
  ): CheckoutController? {
    if (disposed || this.target != target || !CheckoutCoordinator.shared.isActive(checkoutId)) return null
    return manager.createController(context, target)
  }

  override fun handleAction(action: Action) {
    manager.handleAction(action)
  }

  override fun complete(resultCode: String) {
    manager.completion(resultCode)
  }

  override fun retry(message: String?) {
    manager.retry(message)
  }

  override fun controller(): CheckoutController? = manager.checkoutController

  override fun dispose() {
    if (disposed) return
    disposed = true
    manager.dispose()
    CheckoutCoordinator.shared.unregisterPassivePresenter(checkoutId, presenterId, this)
  }
}

/**
 * Uses the coordinator's operation slot and generated event channel, never the legacy MessageBus.
 */
private class FabricComponentEventSink(
  private val checkoutId: String,
  private val presenterId: String,
  private val presenter: CoordinatorPresenter,
) : ComponentEventSink {
  private var ownsOperation = false

  override fun onInteractionStarted(): Boolean =
    try {
      ownsOperation =
        if (CheckoutCoordinator.shared.activeOperationId() == presenterId) {
          true
        } else {
          CheckoutCoordinator.shared.beginPassiveOperation(checkoutId, presenterId, presenter)
          true
        }
      ownsOperation
    } catch (_: IllegalStateException) {
      ownsOperation = false
      false
    }

  override fun onAdvancedSubmit(data: PaymentComponentData<*>) {
    request(
      com.adyenreactnativesdk.coordinator.CoordinatorRequestKind.ADVANCED_SUBMIT,
      EVENT_ADVANCED_SUBMIT,
      PaymentComponentData.SERIALIZER.serialize(data),
    ) { response ->
      val payload = response?.let(::JSONObject) ?: JSONObject()
      when (payload.optString(TYPE)) {
        ACTION -> presenter.handleAction(Action.SERIALIZER.deserialize(payload.getJSONObject(ACTION)))
        COMPLETED -> presenter.complete(payload.optString(RESULT_CODE, CheckoutResultCode.ERROR.value))
        RETRY -> presenter.retry(payload.optString(MESSAGE).takeIf(String::isNotBlank))
        else -> presenter.retry(null)
      }
    }
  }

  override fun onAdvancedAdditionalDetails(data: ActionComponentData) {
    request(
      com.adyenreactnativesdk.coordinator.CoordinatorRequestKind.ADVANCED_ADDITIONAL_DETAILS,
      EVENT_ADVANCED_ADDITIONAL_DETAILS,
      ActionComponentData.SERIALIZER.serialize(data),
    ) { response ->
      presenter.complete(
        response?.let(::JSONObject)?.optString(RESULT_CODE, CheckoutResultCode.ERROR.value) ?: CheckoutResultCode.ERROR.value,
      )
    }
  }

  override fun onSessionComplete(result: SessionCheckoutResult) {
    if (!ownsOperation) return
    CheckoutCoordinator.shared.emitTerminal(
      checkoutId,
      EVENT_COMPLETION,
      JSONObject()
        .put(
          RESULT_CODE,
          result.resultCode.value,
        ).put(SESSION_ID, result.sessionId)
        .put(SESSION_DATA, result.sessionData)
        .toString(),
    )
  }

  override fun onComplete(resultCode: String) {
    if (!ownsOperation) return
    CheckoutCoordinator.shared.emitTerminal(checkoutId, EVENT_COMPLETION, JSONObject().put(RESULT_CODE, resultCode).toString())
  }

  override fun onError() {
    if (!ownsOperation) return
    CheckoutCoordinator.shared.emitTerminal(
      checkoutId,
      EVENT_ERROR,
      JSONObject().put(ERROR_MESSAGE, "Checkout failed").put(ERROR_CODE, "checkoutFailed").toString(),
    )
  }

  private fun request(
    kind: com.adyenreactnativesdk.coordinator.CoordinatorRequestKind,
    eventKind: String,
    payload: JSONObject,
    resume: (String?) -> Unit,
  ) {
    try {
      CheckoutCoordinator.shared.beginRequest(
        operationId = presenterId,
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
