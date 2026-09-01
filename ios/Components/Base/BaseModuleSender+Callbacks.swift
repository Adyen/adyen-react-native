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
/// must return a result; the bridge suspends them on ``AdvancedResultSink`` until JS responds.
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

    // MARK: - Suspension helpers

    @MainActor
    internal func awaitSubmitResult(for data: PaymentComponentData) async -> SubmitResult {
        sendSubmitEvent(data: data)
        return await resultSink.awaitSubmit()
    }

    @MainActor
    internal func awaitAdditionalDetailsResult(for data: ActionComponentData) async -> AdditionalDetailsResult {
        sendProvideEvent(actionData: data)
        return await resultSink.awaitAdditionalDetails()
    }
}
