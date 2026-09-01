//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import UIKit

/// Per-view controller for an embedded `<AdyenComponent>` view.
///
/// Owns the ``CheckoutPaymentComponent`` created for a single `viewId` within the shared checkout
/// context, and tags every emitted event with that `viewId` so the JS side can demux events from
/// multiple simultaneous embedded views. The checkout context is created by ``ContextModule`` at
/// `setup` time. In the advanced flow this proxy re-points the checkout's lifecycle closures at
/// itself so events are emitted through ``ComponentModule`` (viewId-tagged) rather than the
/// untagged ``ContextModule`` events; the session flow keeps ContextModule's session callbacks.
@MainActor
internal final class ComponentProxy {

    private enum Keys {
        static let viewId = "viewId"
        static let resultCode = "resultCode"
    }

    let viewId: String
    private weak var bus: ComponentModule?

    private var checkout: PaymentCheckout?
    private var paymentComponent: CheckoutPaymentComponent?
    /// Suspended advanced-flow closures for this view. Each proxy owns its own sink so a result
    /// resumes the view that opened the request.
    private let resultSink = AdvancedResultSink()

    init(viewId: String, bus: ComponentModule) {
        self.viewId = viewId
        self.bus = bus
    }

    // MARK: - Component creation

    /// Builds the payment component for the generic `<AdyenComponent>` view within the shared
    /// checkout context created by ``ContextModule`` at `setup` time. In the advanced flow it also
    /// re-wires the checkout's lifecycle closures to this proxy so events are emitted viewId-tagged
    /// through ``ComponentModule``.
    @MainActor
    func makeViewController(type: String, configuration _: NSDictionary) async throws -> UIViewController? {
        guard let state = BaseModule.checkoutState else {
            print("⚠️ AdyenReactNative: checkoutState is nil — call setup() or setupAdvanced() first")
            throw ModuleException.componentNotRegistered(viewId)
        }
        let checkout = state.checkoutContext
        self.checkout = checkout

        guard let paymentMethodType = PaymentMethodType(rawValue: type) else {
            throw ModuleException.invalidPaymentMethods
        }

        let component = try checkout.createPaymentComponent(for: paymentMethodType)
        paymentComponent = component

        // The advanced flow drives its lifecycle through the shared checkout's closures. Re-point
        // them at this proxy so every event is tagged with `viewId` and emitted through
        // ``ComponentModule`` instead of the untagged ``ContextModule`` events. This lets the JS
        // subscription manager route submit / additional-details / completion / error results to
        // the matching embedded view. The session flow leaves ContextModule's session callbacks
        // untouched and surfaces errors via ``sendError(error:)``.
        if let advanced = checkout as? AdvancedCheckout {
            setupAdvancedCallbacks(on: advanced)
        }

        return component.viewController
    }

    // MARK: - Advanced-flow callback bridging (viewId-tagged)

    /// Wires the advanced-flow closures on the shared checkout to viewId-tagged event emission.
    /// Each `onSubmit` / `onAdditionalDetails` closure emits its event through ``ComponentModule``
    /// and suspends on a continuation until JS forwards a result via ``handle(action:)`` /
    /// ``resolveCompletion(resultCode:)`` / ``resolveRetry(message:)``.
    @MainActor
    private func setupAdvancedCallbacks(on checkout: AdvancedCheckout) {
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

    @MainActor
    private func awaitSubmitResult(for data: PaymentComponentData) async -> SubmitResult {
        sendSubmitEvent(data: data)
        return await resultSink.awaitSubmit()
    }

    @MainActor
    private func awaitAdditionalDetailsResult(for data: ActionComponentData) async -> AdditionalDetailsResult {
        sendProvideEvent(actionData: data)
        return await resultSink.awaitAdditionalDetails()
    }

    // MARK: - JS-routed commands

    /// Forwards a JS-provided action. In the advanced flow a pending submit is resumed with the
    /// action so the SDK presents it (e.g. 3DS); otherwise the action is handled by the checkout.
    func handle(action: Action) {
        if resultSink.isAwaitingSubmit {
            resultSink.resolveSubmit(.action(action))
        } else {
            ensureMainThread { [weak self] in
                self?.checkout?.handle(action: action)
            }
        }
    }

    /// Resumes a pending submit / additional-details closure with a completion result code.
    func resolveCompletion(resultCode: String) {
        if resultSink.isAwaitingSubmit {
            resultSink.resolveSubmit(.completion(resultCode: resultCode))
        } else if resultSink.isAwaitingAdditionalDetails {
            resultSink.resolveAdditionalDetails(.completion(resultCode: resultCode))
        }
    }

    /// Resumes a pending submit closure to let the shopper retry.
    func resolveRetry(message: String?) {
        resultSink.resolveSubmit(.retry(errorMessage: message))
    }

    // MARK: - Event emission (viewId-tagged)

    func sendError(error: Error) {
        guard let bus else { return }
        if BaseModule.checkoutState?.isSession == true {
            let errorToSend = bus.checkErrorType(error)
            bus.sendEvent(event: .failSession, body: taggedBody(errorToSend.jsonObject))
            return
        }
        let errorToSend = bus.checkErrorType(error)
        bus.sendEvent(event: .fail, body: taggedBody(errorToSend.jsonObject))
    }

    private func sendSubmitEvent(data: PaymentComponentData) {
        guard let bus else { return }
        let extra = (data.paymentMethod as? ApplePayDetails)?.extraData
        let response = SubmitData(paymentData: data.jsonObject, extra: extra)
        bus.sendEvent(event: .submit, body: taggedBody(response.jsonObject))
    }

    private func sendProvideEvent(actionData: ActionComponentData) {
        guard let bus else { return }
        bus.sendEvent(event: .additionalDetails, body: taggedBody(actionData.jsonObject))
    }

    private func sendCompleteEvent(resultCode: CheckoutResultCode) {
        guard let bus else { return }
        bus.sendEvent(event: .complete, body: taggedBody([Keys.resultCode: resultCode.rawValue]))
    }

    private func taggedBody(_ body: [String: Any]) -> [String: Any] {
        var dict = body
        dict[Keys.viewId] = viewId
        return dict
    }

    // MARK: - Teardown

    func dispose() {
        resultSink.cancelPending()
        paymentComponent = nil
        checkout = nil
    }
}
