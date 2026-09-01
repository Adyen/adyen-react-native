/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging

/**
 * Identifies which presenter produced an event, carried as the `source` field on the payload.
 *
 * Attribution matters because event names are global on both platforms: Drop-in, the headless
 * context flow and embedded views all emit the same names, and JS has to resume the continuation
 * belonging to whichever one is actually awaiting a result.
 *
 * Embedded views are identified by `viewId` instead (see [TaggedEmitter.forView]); a payload
 * carrying a `viewId` belongs to that view regardless of `source`.
 *
 * These values are part of the JS contract — keep them in sync with the presenter ids in
 * `src/AdyenCheckout.ts`.
 */
object EventSource {
  /** The headless context flow: `checkout.submit(type)` driven by `ContextModule`. */
  const val CONTEXT = "context"

  /** Drop-in. Also the fallback JS assumes when a payload carries no tag at all. */
  const val DROPIN = "dropin"
}
