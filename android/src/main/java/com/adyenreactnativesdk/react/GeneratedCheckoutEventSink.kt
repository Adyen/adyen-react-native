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
  val operationId: String,
  val requestId: String,
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
    val requestEvent = event as? CoordinatorEvent.Request ?: return
    val kind = requestEvent.eventKind ?: return
    emit(
      GeneratedCheckoutEvent(
        checkoutId = requestEvent.request.checkoutId,
        operationId = requestEvent.request.operationId,
        requestId = requestEvent.request.requestId,
        kind = kind,
        payloadJson = requestEvent.payloadJson,
      ),
    )
  }
}
