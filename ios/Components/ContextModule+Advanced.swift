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

    /// Re-points the shared checkout's advanced closures back at this module.
    ///
    /// ``ComponentProxy`` takes ownership of `onSubmit` / `onAdditionalDetails` on the shared
    /// ``AdvancedCheckout`` while an embedded view is mounted — the closures live on the one
    /// checkout object, so the last writer wins. When the final proxy is disposed the context has
    /// to own them again, otherwise a headless ``submit(_:)`` suspends on a disposed proxy and
    /// never resumes. No-op outside the advanced flow.
    @MainActor
    internal func reattachAdvancedCallbacks() {
        guard let advanced = BaseModule.checkoutState?.checkoutContext as? AdvancedCheckout else { return }
        setupAdvancedCallbacks(on: advanced)
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

    // MARK: - Event emission

    /// Stamps a payload with the presenter identity so JS routes the result back to this module
    /// rather than to Drop-in. Drop-in emits untagged for now, which JS reads as Drop-in.
    private func taggedBody(_ body: [String: Any]) -> [String: Any] {
        var tagged = body
        tagged[EventSource.key] = EventSource.context
        return tagged
    }

    private func sendSubmitEvent(data: PaymentComponentData) {
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        sendEvent(withName: EventName.submit.rawValue, body: taggedBody(response.jsonObject))
    }

    private func sendProvideEvent(actionData: ActionComponentData) {
        sendEvent(withName: EventName.additionalDetails.rawValue, body: taggedBody(actionData.jsonObject))
    }

    private func sendCompleteEvent(resultCode: CheckoutResultCode) {
        sendEvent(withName: EventName.complete.rawValue, body: taggedBody([Key.resultCode: resultCode.rawValue]))
    }

    private enum Key {
        static let resultCode = "resultCode"
    }
}
