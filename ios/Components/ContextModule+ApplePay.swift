//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Contacts
import PassKit

// MARK: - v6 Apple Pay callback bridging

/// The v6 SDK replaced the `ApplePayComponentDelegate` / `ApplePayAuthorizationDelegate`
/// protocols with `async` closures configured on ``ApplePayConfiguration``. Each closure emits
/// the matching React Native event and suspends on a continuation until JS responds through the
/// corresponding `provide…` method below. ContextModule owns this bridging in v6.
extension ContextModule {

    /// Builds the v6 ``ApplePayConfiguration`` from [configuration] and attaches the callback
    /// closures (authorization, shipping contact, shipping method, coupon) so shopper interactions
    /// in the Apple Pay sheet are bridged to React Native events. Returns `nil` when the
    /// configuration carries no Apple Pay merchant setup or no payment, leaving Apple Pay unoffered.
    internal func makeApplePayConfiguration(parser: RootConfigurationParser,
                                            configuration: NSDictionary) throws -> ApplePayConfiguration? {
        let applePayParser = ApplepayConfigurationParser(configuration: configuration)
        guard applePayParser.merchantID != nil, let amount = parser.amount, let countryCode = parser.countryCode else {
            return nil
        }
        return try attachCallbacks(to: applePayParser.buildConfiguration(amount: amount, countryCode: countryCode))
    }

    private func attachCallbacks(to base: ApplePayConfiguration) -> ApplePayConfiguration {
        var configuration = base
            .onAuthorize { [weak self] payment in
                await self?.awaitAuthorization(payment: payment)
                    ?? PKPaymentAuthorizationResult(status: .failure, errors: nil)
            }
            .onSelectShippingContact { [weak self] contact, summaryItems in
                await self?.awaitShippingContact(contact: contact, summaryItems: summaryItems)
                    ?? PKPaymentRequestShippingContactUpdate(paymentSummaryItems: summaryItems)
            }
            .onSelectShippingMethod { [weak self] shippingMethod, summaryItems in
                await self?.awaitShippingMethod(shippingMethod: shippingMethod, summaryItems: summaryItems)
                    ?? PKPaymentRequestShippingMethodUpdate(paymentSummaryItems: summaryItems)
            }
        if #available(iOS 15.0, *) {
            configuration = configuration.onChangeCouponCode { [weak self] couponCode, summaryItems in
                await self?.awaitCouponCode(couponCode: couponCode, summaryItems: summaryItems)
                    ?? PKPaymentRequestCouponCodeUpdate(paymentSummaryItems: summaryItems)
            }
        }
        return configuration
    }

    @MainActor
    internal func awaitAuthorization(payment: PKPayment) async -> PKPaymentAuthorizationResult {
        await authorizationBridge.suspend(superseding: .init(status: .failure, errors: nil)) {
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
            self.sendEvent(event: .authorizePayment, body: body)
        }
    }

    @MainActor
    internal func awaitShippingContact(
        contact: PKContact,
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestShippingContactUpdate {
        currentSummaryItems = summaryItems
        return await shippingContactBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) {
            self.sendEvent(event: .updateShippingContact, body: contact.jsonObject)
        }
    }

    @MainActor
    internal func awaitShippingMethod(
        shippingMethod: PKShippingMethod,
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestShippingMethodUpdate {
        currentSummaryItems = summaryItems
        return await shippingMethodBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) {
            self.sendEvent(event: .updateShippingMethod, body: shippingMethod.jsonObject)
        }
    }

    @MainActor
    internal func awaitCouponCode(
        couponCode: String,
        summaryItems: [PKPaymentSummaryItem]
    ) async -> PKPaymentRequestCouponCodeUpdate {
        currentSummaryItems = summaryItems
        return await couponCodeBridge.suspend(superseding: .init(paymentSummaryItems: summaryItems)) {
            self.sendEvent(event: .updateCouponCode, body: [ApplePayKeys.couponCode: couponCode])
        }
    }
}

// MARK: - Provider methods (JS → native)

extension ContextModule {

    @MainActor
    internal func cancelApplePayCallbacks() {
        authorizationBridge.resolve(.init(status: .failure, errors: nil))
        shippingContactBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        shippingMethodBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
        couponCodeBridge.resolve(.init(paymentSummaryItems: currentSummaryItems))
    }

    @objc
    func provideAuthorizationResult(_ result: NSDictionary) {
        let dict = result as? [String: Any] ?? [:]
        let success = (dict[ApplePayKeys.Update.status] as? String) == "success"
        let errors = parseErrors(dict)
        let status: PKPaymentAuthorizationStatus = success ? .success : .failure
        ensureMainThread { [weak self] in
            self?.authorizationBridge.resolve(.init(status: status, errors: errors))
        }
    }

    @objc
    func provideCouponCodeUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        ensureMainThread { [weak self] in
            guard let self else { return }
            let summaryItems = self.parseSummaryItems(dict) ?? self.currentSummaryItems
            let shippingMethods = self.parseShippingMethods(dict) ?? self.currentShippingMethods
            self.currentShippingMethods = shippingMethods
            self.couponCodeBridge.resolve(
                .init(errors: self.parseErrors(dict), paymentSummaryItems: summaryItems, shippingMethods: shippingMethods)
            )
        }
    }

    @objc
    func provideShippingContactUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        ensureMainThread { [weak self] in
            guard let self else { return }
            let summaryItems = self.parseSummaryItems(dict) ?? self.currentSummaryItems
            let shippingMethods = self.parseShippingMethods(dict) ?? self.currentShippingMethods
            self.currentShippingMethods = shippingMethods
            self.shippingContactBridge.resolve(
                .init(errors: self.parseErrors(dict), paymentSummaryItems: summaryItems, shippingMethods: shippingMethods)
            )
        }
    }

    @objc
    func provideShippingMethodUpdate(_ update: NSDictionary) {
        let dict = update as? [String: Any] ?? [:]
        ensureMainThread { [weak self] in
            guard let self else { return }
            let summaryItems = self.parseSummaryItems(dict) ?? self.currentSummaryItems
            self.shippingMethodBridge.resolve(.init(paymentSummaryItems: summaryItems))
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

// MARK: - Apple Pay serialization helpers

extension ApplePayDetails {

    private enum Key {
        static let billingContact = "billingContact"
        static let network = "network"
        static let shippingContact = "shippingContact"
    }

    internal var extraData: [String: Any] {
        [
            Key.billingContact: self.billingContact?.jsonObject,
            Key.network: self.network,
            Key.shippingContact: self.shippingContact?.jsonObject
        ]
    }
}

extension PKShippingMethod {
    var jsonObject: [String: Any] {
        var dict: [String: Any] = [
            ApplePayKeys.SummaryItem.label: label,
            ApplePayKeys.SummaryItem.amount: amount.stringValue,
            ApplePayKeys.SummaryItem.type: type == .pending ? "pending" : "final"
        ]
        if let identifier {
            dict[ApplePayKeys.ShippingMethod.identifier] = identifier
        }
        if let detail {
            dict[ApplePayKeys.ShippingMethod.detail] = detail
        }
        if #available(iOS 15.0, *), let range = dateComponentsRange {
            if let start = Calendar.current.date(from: range.startDateComponents) {
                dict[ApplePayKeys.ShippingMethod.startDate] = iso8601Formatter.string(from: start)
            }
            if let end = Calendar.current.date(from: range.endDateComponents) {
                dict[ApplePayKeys.ShippingMethod.endDate] = iso8601Formatter.string(from: end)
            }
        }
        return dict
    }
}

// MARK: - Apple Pay error helpers

/// Converts a JS error descriptor dictionary into an NSError for Apple Pay.
/// Expected keys: `type` (string), `field` (string, optional), `message` (string).
internal func applePayError(from dict: [String: Any]) -> Error? {
    guard let type = dict[ApplePayKeys.PaymentError.type] as? String,
          let message = dict[ApplePayKeys.PaymentError.message] as? String else { return nil }
    let field = dict[ApplePayKeys.PaymentError.field] as? String
    switch type {
    case "shippingAddress":
        return PKPaymentRequest.paymentShippingAddressInvalidError(withKey: postalAddressKey(for: field), localizedDescription: message)
    case "billingAddress":
        return PKPaymentRequest.paymentBillingAddressInvalidError(withKey: postalAddressKey(for: field), localizedDescription: message)
    case "contactField":
        return PKPaymentRequest.paymentContactInvalidError(withContactField: PKContactField.fromString(field ?? ""), localizedDescription: message)
    case "couponCode":
        if #available(iOS 15.0, *) {
            return PKPaymentRequest.paymentCouponCodeInvalidError(localizedDescription: message)
        }
        return nil
    default:
        return nil
    }
}

private func postalAddressKey(for field: String?) -> String {
    switch field {
    case "street", "addressLines": return CNPostalAddressStreetKey
    case "city", "locality": return CNPostalAddressCityKey
    case "state", "administrativeArea": return CNPostalAddressStateKey
    case "postalCode": return CNPostalAddressPostalCodeKey
    case "country": return CNPostalAddressCountryKey
    case "countryCode": return CNPostalAddressISOCountryCodeKey
    case "subLocality": return CNPostalAddressSubLocalityKey
    case "subAdministrativeArea": return CNPostalAddressSubAdministrativeAreaKey
    default: return field ?? CNPostalAddressStreetKey
    }
}

extension PKContact {
    var jsonObject: [String: Any] {
        var dictionary: [String: Any] = [:]

        if let email = self.emailAddress {
            dictionary[ApplePayKeys.Contact.emailAddress] = email
        }

        if let phoneNumber = self.phoneNumber {
            dictionary[ApplePayKeys.Contact.phoneNumber] = phoneNumber.stringValue
        }

        if let name = self.name {
            dictionary[ApplePayKeys.Contact.givenName] = name.givenName
            dictionary[ApplePayKeys.Contact.familyName] = name.familyName
        }

        if let name = self.name?.phoneticRepresentation {
            dictionary[ApplePayKeys.Contact.phoneticGivenName] = name.givenName
            dictionary[ApplePayKeys.Contact.phoneticFamilyName] = name.familyName
        }

        if let postalAddress = self.postalAddress {
            dictionary[ApplePayKeys.Contact.addressLines] = postalAddress.street
            dictionary[ApplePayKeys.Contact.subLocality] = postalAddress.subLocality
            dictionary[ApplePayKeys.Contact.locality] = postalAddress.city
            dictionary[ApplePayKeys.Contact.postalCode] = postalAddress.postalCode
            dictionary[ApplePayKeys.Contact.subAdministrativeArea] = postalAddress.subAdministrativeArea
            dictionary[ApplePayKeys.Contact.administrativeArea] = postalAddress.state
            dictionary[ApplePayKeys.Contact.country] = postalAddress.country
            dictionary[ApplePayKeys.Contact.countryCode] = postalAddress.isoCountryCode
        }

        return dictionary
    }
}
