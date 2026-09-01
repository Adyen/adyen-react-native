//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

/// Owns the suspended advanced-flow continuations for a single presenter.
///
/// The v6 SDK drives the advanced flow through `async` closures: `onSubmit` and
/// `onAdditionalDetails` suspend until the merchant returns a result through JS. Each presenter
/// — Drop-in, an embedded view, or the headless context flow — needs its own pair, because a
/// result must resume the presenter that actually opened the request.
///
/// Held as a property rather than inherited. ``ContextModule`` previously re-declared this state
/// because it could not inherit ``BaseModuleSender`` (its own continuations would have collided
/// with the inherited ones), leaving three copies of the same logic across the codebase.
@MainActor
internal final class AdvancedResultSink {

    private var submitContinuation: CheckedContinuation<SubmitResult, Never>?
    private var additionalDetailsContinuation: CheckedContinuation<AdditionalDetailsResult, Never>?

    /// Whether a submit is suspended. Distinguishes which continuation a bare `completion(_:)`
    /// from JS is meant to resume.
    internal var isAwaitingSubmit: Bool {
        submitContinuation != nil
    }

    internal var isAwaitingAdditionalDetails: Bool {
        additionalDetailsContinuation != nil
    }

    /// Whether anything is suspended, so a holder of several sinks can pick the active one.
    internal var isAwaitingResult: Bool {
        isAwaitingSubmit || isAwaitingAdditionalDetails
    }

    // MARK: - Suspension

    internal func awaitSubmit() async -> SubmitResult {
        await withCheckedContinuation { submitContinuation = $0 }
    }

    internal func awaitAdditionalDetails() async -> AdditionalDetailsResult {
        await withCheckedContinuation { additionalDetailsContinuation = $0 }
    }

    // MARK: - Resumption

    /// Resumes a suspended submit. No-op when nothing is pending, so a late or duplicate result
    /// from JS is ignored rather than crashing on a double resume.
    internal func resolveSubmit(_ result: SubmitResult) {
        guard let continuation = submitContinuation else { return }
        submitContinuation = nil
        continuation.resume(returning: result)
    }

    internal func resolveAdditionalDetails(_ result: AdditionalDetailsResult) {
        guard let continuation = additionalDetailsContinuation else { return }
        additionalDetailsContinuation = nil
        continuation.resume(returning: result)
    }

    /// Settles anything still suspended with the SDK's error result code, so a torn-down flow ends
    /// terminally instead of looking like a shopper-initiated retry.
    internal func cancelPending() {
        resolveSubmit(errorSubmitResult)
        resolveAdditionalDetails(errorAdditionalDetailsResult)
    }
}
