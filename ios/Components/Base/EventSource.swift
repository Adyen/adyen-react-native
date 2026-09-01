//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Identifies which presenter produced an event, carried as the `source` field on the payload.
///
/// Attribution matters because event names are delivered globally through `RCTDeviceEventEmitter`
/// on both platforms: Drop-in, the headless context flow and embedded views all emit the same
/// names, and JS has to resume the continuation belonging to whichever one is actually awaiting a
/// result.
///
/// Embedded views are identified by `viewId` instead (see ``ComponentProxy``); a payload carrying a
/// `viewId` belongs to that view regardless of `source`.
///
/// Mirrors `EventSource` on Android and the presenter ids in `src/AdyenCheckout.ts` — keep the
/// three in sync.
internal enum EventSource {

    /// The headless context flow: `checkout.submit(type)` driven by ``ContextModule``.
    internal static let context = "context"

    /// Drop-in. Also the fallback JS assumes when a payload carries no tag at all.
    internal static let dropIn = "dropin"

    /// Payload key the tag is written under.
    internal static let key = "source"
}
