//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Tracks the exact standalone Action operation permitted to present or settle callbacks.
///
/// An operation remains active while its owned UI is dismissing. This keeps a delayed delegate
/// callback from an old operation from attaching to a replacement action.
@MainActor
internal final class ActionOperationGate {

    private var activeID: Int?
    private var finishingID: Int?

    func activate(_ id: Int) -> Bool {
        guard activeID == nil else { return false }
        activeID = id
        return true
    }

    func isActive(_ id: Int) -> Bool {
        activeID == id && finishingID == nil
    }

    func beginCleanup(_ id: Int) -> Bool {
        guard isActive(id) else { return false }
        finishingID = id
        return true
    }

    func completeCleanup(_ id: Int) -> Bool {
        guard activeID == id, finishingID == id else { return false }
        activeID = nil
        finishingID = nil
        return true
    }
}
