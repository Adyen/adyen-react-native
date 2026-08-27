//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseActionModule: BaseModuleSender {

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + [EventName.additionalDetails, EventName.complete].map(\.rawValue)
    }

    @objc
    func action(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendError(error: error)
        }

        ensureMainThread { [weak self] in
            self?.checkout?.handle(action: action)
        }
    }

    /// Wires the action-only-flow closures on the checkout object to React Native event emission.
    /// Replaces the v5 action-component delegate conformance with v6 closure callbacks.
    @MainActor
    internal func setupActionCallbacks(on checkout: ActionOnlyCheckout) {
        self.checkout = checkout
        _ = checkout
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
}
