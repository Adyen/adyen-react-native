//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

/// v6 closure-callback wiring for the advanced (merchant-managed) flow.
///
/// Replaces the v5 payment / action / card delegate conformances.
/// Instead of delegate methods, the checkout object exposes closures that emit the
/// same React Native events. The `onSubmit` and `onAdditionalDetails` closures are asynchronous and
/// must return a result; the bridge suspends them on a continuation until JS responds via
/// ``resolveSubmit(_:)`` / ``resolveAdditionalDetails(_:)``.
extension BaseModuleSender {

    /// Wires the advanced-flow closures on the checkout object to React Native event emission.
    @MainActor
    internal func setupCallbacks(on checkout: AdvancedCheckout) {
        self.checkout = checkout
        _ = checkout
            .onSubmit { [weak self] data in
                await self?.awaitSubmitResult(for: data) ?? errorSubmitResult
            }
            .onAdditionalDetails { [weak self] data in
                await self?.awaitAdditionalDetailsResult(for: data) ?? errorAdditionalDetailsResult
            }
            .onComplete { [weak self] result in
                self?.sendCompleteEvent(resultCode: result.resultCode)
            }
            .onFailure { [weak self] error in
                self?.sendError(error: error)
            }
    }

    // MARK: - JS response bridging

    /// Resumes the pending `onSubmit` closure with the result produced by JS.
    internal func resolveSubmit(_ result: SubmitResult) {
        ensureMainThread { [weak self] in
            self?.submitContinuation?.resume(returning: result)
            self?.submitContinuation = nil
        }
    }

    /// Resumes the pending `onAdditionalDetails` closure with the result produced by JS.
    internal func resolveAdditionalDetails(_ result: AdditionalDetailsResult) {
        ensureMainThread { [weak self] in
            self?.additionalDetailsContinuation?.resume(returning: result)
            self?.additionalDetailsContinuation = nil
        }
    }

    // MARK: - Suspension helpers

    @MainActor
    internal func awaitSubmitResult(for data: PaymentComponentData) async -> SubmitResult {
        sendSubmitEvent(data: data)
        return await withCheckedContinuation { continuation in
            self.submitContinuation = continuation
        }
    }

    @MainActor
    internal func awaitAdditionalDetailsResult(for data: ActionComponentData) async -> AdditionalDetailsResult {
        sendProvideEvent(actionData: data)
        return await withCheckedContinuation { continuation in
            self.additionalDetailsContinuation = continuation
        }
    }
}
