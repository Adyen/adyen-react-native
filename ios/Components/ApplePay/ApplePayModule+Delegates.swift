//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

// MARK: - ApplePayComponentDelegate

extension ApplePayModule: ApplePayComponentDelegate {

    func didUpdate(
        contact: PKContact,
        for payment: ApplePayPayment,
        completion: @escaping (PKPaymentRequestShippingContactUpdate) -> Void
    ) {
        shippingContactHandler = completion
        currentApplePayPayment = payment
        sendEvent(event: .updateShippingContact, body: contact.jsonObject)
    }

    func didUpdate(
        shippingMethod: PKShippingMethod,
        for payment: ApplePayPayment,
        completion: @escaping (PKPaymentRequestShippingMethodUpdate) -> Void
    ) {
        shippingMethodHandler = completion
        currentApplePayPayment = payment
        sendEvent(event: .updateShippingMethod, body: shippingMethod.jsonObject)
    }

    @available(iOS 15.0, *)
    func didUpdate(
        couponCode _: String,
        for payment: ApplePayPayment,
        completion: @escaping (PKPaymentRequestCouponCodeUpdate) -> Void
    ) {
        // Coupon code support is added in the next PR. Auto-resolve to keep the sheet responsive.
        completion(.init(errors: nil, paymentSummaryItems: payment.summaryItems, shippingMethods: currentShippingMethods))
    }
}

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

    @objc
    func provideShippingContactUpdate(_ update: NSDictionary) {
        guard let handler = shippingContactHandler else { return }
        shippingContactHandler = nil
        let dict = update as? [String: Any] ?? [:]
        let summaryItems = parseSummaryItems(dict) ?? currentApplePayPayment?.summaryItems ?? []
        let shippingMethods = parseShippingMethods(dict) ?? currentShippingMethods
        let errors = parseErrors(dict)
        DispatchQueue.main.async {
            self.currentShippingMethods = shippingMethods
            handler(.init(errors: errors, paymentSummaryItems: summaryItems, shippingMethods: shippingMethods))
        }
    }

    @objc
    func provideShippingMethodUpdate(_ update: NSDictionary) {
        guard let handler = shippingMethodHandler else { return }
        shippingMethodHandler = nil
        let dict = update as? [String: Any] ?? [:]
        let summaryItems = parseSummaryItems(dict) ?? currentApplePayPayment?.summaryItems ?? []
        DispatchQueue.main.async {
            handler(.init(paymentSummaryItems: summaryItems))
        }
    }

    // MARK: - Private parsing helpers

    private func parseSummaryItems(_ dict: [String: Any]) -> [PKPaymentSummaryItem]? {
        guard let raw = dict[ApplePayKeys.Update.paymentSummaryItems] as? [[String: Any]] else { return nil }
        let items = raw.compactMap(PKPaymentSummaryItem.init)
        return items.isEmpty ? nil : items
    }

    private func parseShippingMethods(_ dict: [String: Any]) -> [PKShippingMethod]? {
        guard let raw = dict[ApplePayKeys.Update.shippingMethods] as? [[String: Any]] else { return nil }
        return raw.compactMap(PKShippingMethod.initiate)
    }

    internal func parseErrors(_ dict: [String: Any]) -> [Error]? {
        guard let raw = dict[ApplePayKeys.Update.errors] as? [[String: Any]] else { return nil }
        let errors = raw.compactMap { applePayError(from: $0) }
        return errors.isEmpty ? nil : errors
    }
}
