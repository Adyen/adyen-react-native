//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

// MARK: - v6 advanced-flow callback bridging

/// The advanced (merchant-managed) flow drives payments through the ``AdvancedCheckout`` closures
/// rather than delegate methods. Each `onSubmit` / `onAdditionalDetails` closure emits the matching
/// React Native event and suspends on a continuation until JS forwards a result through
/// ``ContextModule/action(_:)`` / ``ContextModule/completion(_:)`` / ``ContextModule/retry(_:)``.
extension ContextModule {

    /// Wires the advanced-flow closures on the checkout object to React Native event emission.
    @MainActor
    internal func setupAdvancedCallbacks(on checkout: AdvancedCheckout) {
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

    // MARK: - Event emission

    private func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        sendEvent(withName: EventName.submit.rawValue, body: response.jsonObject)
    }

    private func sendProvideEvent(actionData: ActionComponentData) {
        sendEvent(withName: EventName.additionalDetails.rawValue, body: actionData.jsonObject)
    }

    private func sendCompleteEvent(resultCode: CheckoutResultCode) {
        sendEvent(withName: EventName.complete.rawValue, body: [Key.resultCode: resultCode.rawValue])
    }

    private enum Key {
        static let resultCode = "resultCode"
    }
}
