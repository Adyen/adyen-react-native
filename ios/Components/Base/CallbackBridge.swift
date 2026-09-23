//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Identifies one suspended callback. A response may settle only the continuation that created
/// this token, never a newer callback of the same family.
@MainActor
internal final class CallbackBridgeToken<Response> {
    fileprivate let continuation: CheckedContinuation<Response, Never>

    fileprivate init(continuation: CheckedContinuation<Response, Never>) {
        self.continuation = continuation
    }
}

/// Bridges one suspended native `async` callback to the JS response that later resolves it via a bridge call.
@MainActor
internal final class CallbackBridge<Response> {

    private var token: CallbackBridgeToken<Response>?

    /// Whether a call is currently suspended awaiting a response.
    internal var isAwaiting: Bool {
        token != nil
    }

    /// Suspends until its exact token receives a response. Any already-suspended callback is
    /// settled first, so its later broker response cannot affect this continuation.
    internal func suspend(
        superseding: Response,
        emit: (CallbackBridgeToken<Response>) -> Void
    ) async -> Response {
        resolve(superseding)
        return await withCheckedContinuation { continuation in
            let token = CallbackBridgeToken(continuation: continuation)
            self.token = token
            emit(token)
        }
    }

    /// Compatibility overload for paths that do not use request correlation.
    internal func suspend(superseding: Response, emit: () -> Void) async -> Response {
        await suspend(superseding: superseding) { _ in emit() }
    }

    /// Resumes the suspended call. No-op when nothing is pending.
    internal func resolve(_ response: Response) {
        guard let token else { return }
        self.token = nil
        token.continuation.resume(returning: response)
    }

    /// Settles only the continuation that owns `token`.
    internal func resolve(_ token: CallbackBridgeToken<Response>, _ response: Response) {
        guard self.token === token else { return }
        self.token = nil
        token.continuation.resume(returning: response)
    }
}
