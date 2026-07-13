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
        couponCode: String,
        for payment: ApplePayPayment,
        completion: @escaping (PKPaymentRequestCouponCodeUpdate) -> Void
    ) {
        couponCodeHandler = completion
        currentApplePayPayment = payment
        sendEvent(event: .updateCouponCode, body: [ApplePayKeys.couponCode: couponCode])
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
        let dict = result as? [String: Any] ?? [:]
        let success = (dict[ApplePayKeys.Update.status] as? String) == "success"
        let errors = parseErrors(dict)
        let status: PKPaymentAuthorizationStatus = success ? .success : .failure
        ensureMainThread { [weak self] in
            guard let self, let handler = self.authorizationHandler else { return }
            self.authorizationHandler = nil
            handler(PKPaymentAuthorizationResult(status: status, errors: errors))
        }
    }

    @available(iOS 15.0, *)
    @objc
    func provideCouponCodeUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        let parsedSummaryItems = parseSummaryItems(dict)
        let parsedShippingMethods = parseShippingMethods(dict)
        let errors = parseErrors(dict)
        ensureMainThread { [weak self] in
            guard let self, let handler = self.couponCodeHandler else { return }
            self.couponCodeHandler = nil
            let summaryItems = parsedSummaryItems ?? self.currentApplePayPayment?.summaryItems ?? []
            let shippingMethods = parsedShippingMethods ?? self.currentShippingMethods
            self.currentShippingMethods = shippingMethods
            handler(.init(errors: errors, paymentSummaryItems: summaryItems, shippingMethods: shippingMethods))
        }
    }

    @objc
    func provideShippingContactUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        let parsedSummaryItems = parseSummaryItems(dict)
        let parsedShippingMethods = parseShippingMethods(dict)
        let errors = parseErrors(dict)
        ensureMainThread { [weak self] in
            guard let self, let handler = self.shippingContactHandler else { return }
            self.shippingContactHandler = nil
            let summaryItems = parsedSummaryItems ?? self.currentApplePayPayment?.summaryItems ?? []
            let shippingMethods = parsedShippingMethods ?? self.currentShippingMethods
            self.currentShippingMethods = shippingMethods
            handler(.init(errors: errors, paymentSummaryItems: summaryItems, shippingMethods: shippingMethods))
        }
    }

    @objc
    func provideShippingMethodUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        let parsedSummaryItems = parseSummaryItems(dict)
        ensureMainThread { [weak self] in
            guard let self, let handler = self.shippingMethodHandler else { return }
            self.shippingMethodHandler = nil
            let summaryItems = parsedSummaryItems ?? self.currentApplePayPayment?.summaryItems ?? []
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
