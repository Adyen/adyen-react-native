//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Bridges one suspended native `async` callback to the JS response that later resolves it via a bridge call.
@MainActor
internal final class CallbackBridge<Response> {

    private var continuation: CheckedContinuation<Response, Never>?

    /// Whether a call is currently suspended awaiting a response.
    internal var isAwaiting: Bool {
        continuation != nil
    }

    /// Suspends until ``resolve(_:)`` supplies a response, running `emit` once suspended. Any already-suspended call is settled with `superseding` first.
    internal func suspend(superseding: Response, emit: () -> Void) async -> Response {
        resolve(superseding)
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            emit()
        }
    }

    /// Resumes the suspended call. No-op when nothing is pending.
    internal func resolve(_ response: Response) {
        guard let continuation else { return }
        self.continuation = nil
        continuation.resume(returning: response)
    }
}
