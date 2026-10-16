/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.AdditionalDetailsResult
import com.adyen.checkout.core.components.CheckoutCallbacks
import com.adyen.checkout.core.components.CheckoutController
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.SubmitResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import com.adyen.checkout.core.error.CheckoutError
import com.adyenreactnativesdk.react.sdkField
import com.adyenreactnativesdk.react.submit
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ComponentManagerTest {
  @Test
  fun `dispose settles suspended submit and details callbacks exactly once`() =
    runBlocking {
      val sink = RecordingSink()
      var callbacks: CheckoutCallbacks? = null
      val manager = manager(sink) { callbacks = it }
      manager.createController(mock<CheckoutContext.Advanced>(), CheckoutTarget.PaymentMethod("scheme"))
      val sdkCallbacks = checkNotNull(callbacks)

      val submit =
        async(start = CoroutineStart.UNDISPATCHED) { sdkCallbacks.submit(PaymentComponentData(paymentMethod = null, order = null)) }
      val details =
        async(start = CoroutineStart.UNDISPATCHED) {
          sdkCallbacks
            .sdkField<suspend (ActionComponentData) -> AdditionalDetailsResult>("onAdditionalDetails")
            .invoke(ActionComponentData(details = null, paymentData = "payment-data"))
        }
      assertTrue(manager.isAwaitingResult)

      manager.dispose()
      manager.dispose()

      assertEquals(SubmitResult.Retry(null), submit.await())
      assertEquals(AdditionalDetailsResult.Completion("Error"), details.await())
      assertFalse(manager.isAwaitingResult)
      assertNull(manager.checkoutController)
      assertEquals(listOf("interaction", "submit", "details"), sink.calls)
    }

  @Test
  fun `creation failure reported by the SDK is not creatable and never a terminal error`() {
    val sink = RecordingSink()
    val manager =
      manager(sink) { callbacks ->
        callbacks.sdkField<(CheckoutError) -> Unit>("onFailure").invoke(mock())
      }

    val controller = manager.createController(mock<CheckoutContext.Advanced>(), CheckoutTarget.PaymentMethod("giftcard"))

    assertNull(controller)
    assertNull(manager.checkoutController)
    assertTrue(sink.calls.isEmpty())
  }

  @Test
  fun `a failure after creation is forwarded through embedded ownership`() {
    val sink = RecordingSink()
    var callbacks: CheckoutCallbacks? = null
    val manager = manager(sink) { callbacks = it }
    val controller = manager.createController(mock<CheckoutContext.Advanced>(), CheckoutTarget.PaymentMethod("scheme"))

    checkNotNull(callbacks).sdkField<(CheckoutError) -> Unit>("onFailure").invoke(mock())

    assertSame(controller, manager.checkoutController)
    assertEquals(listOf("interaction", "error"), sink.calls)
  }

  private fun manager(
    sink: RecordingSink,
    onCreate: (CheckoutCallbacks) -> Unit,
  ): ComponentManager {
    val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
    return ComponentManager(
      activity = activity,
      eventSink = sink,
      controllerFactory = { _, _, callbacks, _ ->
        onCreate(callbacks)
        mock<CheckoutController>()
      },
    )
  }

  private class RecordingSink : ComponentEventSink {
    val calls = mutableListOf<String>()

    override fun onInteractionStarted(): Boolean {
      calls += "interaction"
      return true
    }

    override fun onAdvancedSubmit(data: PaymentComponentData<*>) {
      calls += "submit"
    }

    override fun onAdvancedAdditionalDetails(data: ActionComponentData) {
      calls += "details"
    }

    override fun onSessionComplete(result: SessionCheckoutResult) {
      calls += "session-complete"
    }

    override fun onComplete(resultCode: String) {
      calls += "complete"
    }

    override fun onError() {
      calls += "error"
    }
  }
}
