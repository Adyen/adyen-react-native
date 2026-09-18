//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

/// Holds the advanced flow's two suspended `async` callbacks (`onSubmit`, `onAdditionalDetails`), which wait for a merchant result from JS.
@MainActor
internal final class AdvancedResultSink {

    internal let submit = CallbackBridge<SubmitResult>()
    internal let additionalDetails = CallbackBridge<AdditionalDetailsResult>()

    internal var isAwaitingSubmit: Bool {
        submit.isAwaiting
    }

    internal var isAwaitingAdditionalDetails: Bool {
        additionalDetails.isAwaiting
    }

    /// Whether anything is suspended.
    internal var isAwaitingResult: Bool {
        isAwaitingSubmit || isAwaitingAdditionalDetails
    }

    // MARK: - Suspension

    internal func awaitSubmit(emit: () -> Void) async -> SubmitResult {
        await submit.suspend(superseding: errorSubmitResult, emit: emit)
    }

    internal func awaitAdditionalDetails(emit: () -> Void) async -> AdditionalDetailsResult {
        await additionalDetails.suspend(superseding: errorAdditionalDetailsResult, emit: emit)
    }

    // MARK: - Resumption

    internal func resolveSubmit(_ result: SubmitResult) {
        submit.resolve(result)
    }

    internal func resolveAdditionalDetails(_ result: AdditionalDetailsResult) {
        additionalDetails.resolve(result)
    }

    /// Settles anything still suspended with an error result, so a torn-down flow ends terminally.
    internal func cancelPending() {
        submit.resolve(errorSubmitResult)
        additionalDetails.resolve(errorAdditionalDetailsResult)
    }
}
