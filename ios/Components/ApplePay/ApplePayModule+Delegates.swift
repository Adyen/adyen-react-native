//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

// MARK: - ApplePayAuthorizationDelegate

extension ApplePayModule: ApplePayAuthorizationDelegate {

    func didAuthorize(
        payment: PKPayment,
        completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        authorizationHandler = completion
        var body: [String: Any] = [:]
        if let billing = payment.billingContact {
            body[ApplePayKeys.billingContact] = billing.jsonObject
        }
        if let shipping = payment.shippingContact {
            body[ApplePayKeys.shippingContact] = shipping.jsonObject
        }
        if let method = payment.shippingMethod {
            body[ApplePayKeys.shippingMethod] = method.jsonObject
        }
        sendEvent(event: .authorizePayment, body: body)
    }
}

// MARK: - Provider methods (JS → native)

extension ApplePayModule {

    @objc
    func provideAuthorizationResult(_ result: NSDictionary) {
        guard let handler = authorizationHandler else { return }
        authorizationHandler = nil
        let dict = result as? [String: Any] ?? [:]
        let success = (dict[ApplePayKeys.Update.status] as? String) == "success"
        let errors = parseErrors(dict)
        let status: PKPaymentAuthorizationStatus = success ? .success : .failure
        DispatchQueue.main.async {
            handler(PKPaymentAuthorizationResult(status: status, errors: errors))
        }
    }

    // MARK: - Private parsing helpers

    internal func parseErrors(_ dict: [String: Any]) -> [Error]? {
        guard let raw = dict[ApplePayKeys.Update.errors] as? [[String: Any]] else { return nil }
        let errors = raw.compactMap { applePayError(from: $0) }
        return errors.isEmpty ? nil : errors
    }
}
