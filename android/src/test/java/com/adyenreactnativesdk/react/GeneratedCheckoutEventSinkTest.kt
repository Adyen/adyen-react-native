/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import com.adyenreactnativesdk.coordinator.CoordinatorEvent
import com.adyenreactnativesdk.coordinator.CoordinatorRequest
import com.adyenreactnativesdk.coordinator.CoordinatorRequestKind
import org.junit.Assert.assertEquals
import org.junit.Test

class GeneratedCheckoutEventSinkTest {
  @Test
  fun `forwards each generated coordinator request exactly once`() {
    val emitted = mutableListOf<GeneratedCheckoutEvent>()
    val sink = GeneratedCheckoutEventSink(emitted::add)
    val request =
      CoordinatorRequest(
        checkoutId = "checkout",
        operationId = "operation",
        requestId = "request",
        kind = CoordinatorRequestKind.ADVANCED_SUBMIT,
      )

    sink.emit(
      CoordinatorEvent.Request(
        request = request,
        eventKind = "advancedSubmit",
        payloadJson = """{"amount":1}""",
      ),
    )

    assertEquals(
      listOf(
        GeneratedCheckoutEvent(
          checkoutId = "checkout",
          operationId = "operation",
          requestId = "request",
          kind = "advancedSubmit",
          payloadJson = """{"amount":1}""",
        ),
      ),
      emitted,
    )
  }
}
