//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Bridges one suspended native callback to the JS response that resolves it.
///
/// Every feedback-style callback has the same shape: the SDK invokes an `async` closure, we emit an
/// event, and a later module method supplies the result. The response arrives as a separate bridge
/// call rather than a return value, so the invocation has to be suspended in between — which is the
/// one piece of machinery the React Native layer has to invent, because a native integration simply
/// returns from the closure.
///
/// Holding that state in one place rather than as a continuation property per callback removes the
/// store / resume / nil-out sequence from every call site, and with it the chance of dropping a
/// continuation without resuming it.
@MainActor
internal final class CallbackBridge<Response> {

    private var continuation: CheckedContinuation<Response, Never>?

    /// Whether a call is currently suspended awaiting a response.
    internal var isAwaiting: Bool {
        continuation != nil
    }

    /// Suspends until ``resolve(_:)`` supplies a response, running `emit` once suspended.
    ///
    /// `emit` is invoked *inside* the continuation body so the event cannot reach JS — and a
    /// response cannot come back — before there is something to resume.
    ///
    /// A call already suspended is settled with `superseding` first. A continuation dropped without
    /// being resumed leaks, and Swift reports that at runtime.
    internal func suspend(superseding: Response, emit: () -> Void) async -> Response {
        resolve(superseding)
        return await withCheckedContinuation { continuation in
            self.continuation = continuation
            emit()
        }
    }

    /// Resumes the suspended call.
    ///
    /// No-op when nothing is pending, so a late or duplicate response from JS is ignored rather
    /// than crashing on a double resume.
    internal func resolve(_ response: Response) {
        guard let continuation else { return }
        self.continuation = nil
        continuation.resume(returning: response)
    }
}
