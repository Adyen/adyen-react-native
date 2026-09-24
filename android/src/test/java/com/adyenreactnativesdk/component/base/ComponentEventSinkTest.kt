/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.action.data.Action
import com.adyen.checkout.core.action.data.ActionComponentData
import com.adyen.checkout.core.components.SessionCheckoutResult
import com.adyen.checkout.core.components.data.PaymentComponentData
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ComponentEventSinkTest {
  @Test
  fun `first terminal failure acquires embedded ownership before forwarding error`() {
    val sink = RecordingEventSink(interactionStarted = true)

    sink.reportTerminalFailure()

    assertEquals(1, sink.interactionStarts)
    assertEquals(1, sink.errors)
  }

  @Test
  fun `competing terminal failure emits no merchant error`() {
    val sink = RecordingEventSink(interactionStarted = false)

    sink.reportTerminalFailure()

    assertEquals(1, sink.interactionStarts)
    assertEquals(0, sink.errors)
    assertFalse(sink.interactionStarted)
  }

  private class RecordingEventSink(
    val interactionStarted: Boolean,
  ) : ComponentEventSink {
    var interactionStarts = 0
    var errors = 0

    override fun onInteractionStarted(): Boolean {
      interactionStarts += 1
      return interactionStarted
    }

    override fun onAdvancedSubmit(data: PaymentComponentData<*>) = Unit

    override fun onAdvancedAdditionalDetails(data: ActionComponentData) = Unit

    override fun onSessionComplete(result: SessionCheckoutResult) = Unit

    override fun onComplete(resultCode: String) = Unit

    override fun onError() {
      errors += 1
    }
  }
}
