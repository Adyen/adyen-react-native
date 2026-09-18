//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCheckout

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
        await resultSink.awaitSubmit { sendSubmitEvent(data: data) }
    }

    @MainActor
    internal func awaitAdditionalDetailsResult(for data: ActionComponentData) async -> AdditionalDetailsResult {
        await resultSink.awaitAdditionalDetails { sendProvideEvent(actionData: data) }
    }
}
