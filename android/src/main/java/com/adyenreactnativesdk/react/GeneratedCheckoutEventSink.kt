/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import com.adyenreactnativesdk.coordinator.CheckoutEventSink
import com.adyenreactnativesdk.coordinator.CoordinatorEvent

/** Coordinator event payload ready for the generated Checkout TurboModule event emitter. */
internal data class GeneratedCheckoutEvent(
  val checkoutId: String,
  val operationId: String?,
  val requestId: String?,
  val kind: String,
  val payloadJson: String?,
)

/**
 * Production bridge adapter for coordinator request events. Lifecycle-only coordinator events
 * stay native because they have no generated event kind.
 */
internal class GeneratedCheckoutEventSink(
  private val emit: (GeneratedCheckoutEvent) -> Unit,
) : CheckoutEventSink {
  override fun emit(event: CoordinatorEvent) {
    when (event) {
      is CoordinatorEvent.Request -> {
        val kind = event.eventKind ?: return
        emit(
          GeneratedCheckoutEvent(
            checkoutId = event.request.checkoutId,
            operationId = event.request.operationId,
            requestId = event.request.requestId,
            kind = kind,
            payloadJson = event.payloadJson,
          ),
        )
      }

      is CoordinatorEvent.Terminal -> {
        emit(
          GeneratedCheckoutEvent(
            checkoutId = event.checkoutId,
            operationId = null,
            requestId = null,
            kind = event.kind,
            payloadJson = event.payloadJson,
          ),
        )
      }

      else -> {
        Unit
      }
    }
  }
}
