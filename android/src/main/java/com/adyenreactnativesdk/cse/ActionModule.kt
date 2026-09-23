/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentManager
import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.action.data.RedirectAction
import com.adyen.checkout.core.common.CheckoutResultCode
import com.adyen.checkout.core.components.ActionOnlyCheckoutCallbacks
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.Checkout
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.threeds2.ThreeDS2Service
import com.adyenreactnativesdk.component.base.CheckoutFragment
import com.adyenreactnativesdk.component.base.KnownException
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.component.base.toModuleException
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.react.NativeAdyenActionSpec
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicLong

/**
 * Generated standalone Action TurboModule.
 *
 * The module owns no payment-checkout state. It accepts one action at a time, rejects overlap
 * with `actionBusy`, and binds every SDK callback to the operation that created it.
 */
class ActionModule(
  private val reactContext: ReactApplicationContext,
) : NativeAdyenActionSpec(reactContext),
  LifecycleEventListener {
  private var activeAction: ActiveAction? = null

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun handle(
    actionJson: String,
    configurationJson: String,
    promise: Promise,
  ) {
    onMain {
      if (activeAction != null) {
        promise.reject(ERROR_BUSY, "A standalone action is already active")
        return@onMain
      }

      val action: Action
      val configuration: CheckoutConfiguration
      try {
        action = Action.SERIALIZER.deserialize(JSONObject(actionJson))
        if (action is RedirectAction) {
          // TODO: Support redirects when Adyen publishes a hook that safely correlates each
          // standalone operation with its return, without rewriting the opaque provider URL.
          promise.reject(
            ERROR_UNSUPPORTED_CAPABILITY,
            "Standalone RedirectAction is unsupported by the pinned Android SDK",
          )
          return@onMain
        }
        val configurationObject = JSONObject(configurationJson)
        configuration = CheckoutConfigurationFactory.get(ReactNativeJson.convertJsonToMap(configurationObject))
      } catch (error: ModuleException) {
        promise.reject(error.code, error.message, error)
        return@onMain
      } catch (error: Exception) {
        promise.reject(ERROR_PARSING, error.message, error)
        return@onMain
      }

      val activity = reactContext.currentActivity as? AppCompatActivity
      if (activity == null) {
        promise.reject(ERROR_CANCELLED, "No active host for standalone action")
        return@onMain
      }
      val ownerToken = ActionOperationToken.create()
      if (!ActionOwnerRegistry.acquire(ownerToken)) {
        promise.reject(ERROR_BUSY, "A standalone action is already active")
        return@onMain
      }
      val operation =
        ActiveAction(
          ownerToken = ownerToken,
          promise = promise,
          fragmentManager = activity.supportFragmentManager,
        )
      activeAction = operation

      activity.lifecycleScope.launch {
        when (val result = Checkout.setup(action, configuration)) {
          is Checkout.Result.Success -> {
            if (!isUsable(operation)) return@launch
            val controller =
              CheckoutController(
                context = result.checkoutContext,
                callbacks = callbacks(operation),
                coroutineScope = activity.lifecycleScope,
              )
            operation.controller = controller
            CheckoutFragment.show(
              fragmentManager = activity.supportFragmentManager,
              tag = operation.fragmentTag,
              controllerProvider = { if (isUsable(operation)) controller else null },
              cancellable = true,
              onCancelled = { cancel(operation) },
            )
          }

          is Checkout.Result.Error -> {
            reject(operation, result.error.toModuleException())
          }
        }
      }
    }
  }

  override fun hide(promise: Promise) {
    onMain {
      val operation = activeAction
      if (operation == null) {
        promise.resolve(null)
      } else {
        cancel(operation) { promise.resolve(null) }
      }
    }
  }

  override fun getThreeDS2SdkVersion(promise: Promise) {
    promise.resolve(ThreeDS2Service.INSTANCE.sdkVersion)
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    onMain { activeAction?.let(::cancel) }
  }

  override fun invalidate() {
    reactContext.removeLifecycleEventListener(this)
    onMain { activeAction?.let(::cancel) }
    super.invalidate()
  }

  private fun callbacks(operation: ActiveAction): ActionOnlyCheckoutCallbacks =
    ActionOnlyCheckoutCallbacks(
      onAdditionalDetails = { data ->
        resolve(operation, ActionComponentData.SERIALIZER.serialize(data).toString())
        AdditionalDetailsResult.Completion(CheckoutResultCode.AUTHORISED.value)
      },
      onFailure = { error -> reject(operation, error.toModuleException()) },
    )

  private fun resolve(
    operation: ActiveAction,
    value: String,
  ) {
    finish(operation) {
      operation.promise.resolve(value)
    }
  }

  private fun reject(
    operation: ActiveAction,
    error: Exception,
  ) {
    val knownError = error as? KnownException
    finish(operation) {
      operation.promise.reject(knownError?.code ?: ERROR_COMPONENT, error.message, error)
    }
  }

  private fun cancel(
    operation: ActiveAction,
    afterCleanup: () -> Unit = {},
  ) {
    finish(operation) {
      operation.promise.reject(ERROR_CANCELLED, "Standalone action cancelled")
      afterCleanup()
    }
  }

  private fun finish(
    operation: ActiveAction,
    settle: () -> Unit,
  ) {
    if (!isActive(operation) || operation.finishing) return
    operation.finishing = true
    operation.controller = null
    val complete: () -> Unit = completion@{
      if (activeAction !== operation) return@completion
      activeAction = null
      ActionOwnerRegistry.release(operation.ownerToken)
      settle()
    }
    CheckoutFragment.hide(
      fragmentManager = operation.fragmentManager,
      tag = operation.fragmentTag,
      onDismissed = complete,
    )
  }

  private fun isActive(operation: ActiveAction): Boolean = activeAction === operation

  private fun isUsable(operation: ActiveAction): Boolean = isActive(operation) && !operation.finishing

  private fun onMain(action: () -> Unit) {
    reactContext.runOnUiQueueThread(action)
  }

  private class ActiveAction(
    val ownerToken: String,
    val promise: Promise,
    val fragmentManager: FragmentManager,
    var controller: CheckoutController? = null,
    var finishing: Boolean = false,
  ) {
    val fragmentTag = "$FRAGMENT_TAG_PREFIX-$ownerToken"
  }

  private companion object {
    const val FRAGMENT_TAG_PREFIX = "AdyenStandaloneAction"
    const val ERROR_BUSY = "actionBusy"
    const val ERROR_CANCELLED = "cancelled"
    const val ERROR_COMPONENT = "actionError"
    const val ERROR_PARSING = "parsingError"
    const val ERROR_UNSUPPORTED_CAPABILITY = "unsupportedCapability"
  }
}

/**
 * Native-only ownership identity for a standalone Action operation.
 *
 * A React runtime can be torn down and recreated in the same process, so module-local counters
 * cannot identify process-global Action ownership.
 */
internal object ActionOperationToken {
  private val nextValue = AtomicLong()

  fun create(): String = "action-${nextValue.incrementAndGet()}"
}

/**
 * Process-wide reservation for the one standalone Action UI supported by the Android SDK.
 *
 * A module instance belongs to a React runtime and can be recreated while a previous runtime is
 * still dismissing its fragment. Only the exact token that acquired this reservation may release
 * it, so late cleanup from that previous runtime cannot clear a newer owner's reservation.
 */
internal object ActionOwnerRegistry {
  private var ownerToken: String? = null

  @Synchronized
  fun acquire(token: String): Boolean {
    if (ownerToken != null) return false
    ownerToken = token
    return true
  }

  @Synchronized
  fun release(token: String) {
    if (ownerToken == token) {
      ownerToken = null
    }
  }

  @Synchronized
  fun owns(token: String): Boolean = ownerToken == token
}
