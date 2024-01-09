//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

public struct ApplepayConfigurationParser {

    private var dict: [String: Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configurationNode = configuration[ApplePayKeys.rootKey] as? [String: Any] {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    var merchantID: String? {
        dict[ApplePayKeys.merchantID] as? String
    }

    var merchantName: String? {
        dict[ApplePayKeys.merchantName] as? String
    }

    var allowOnboarding: Bool {
        if let bool = dict[ApplePayKeys.allowOnboarding] as? Bool {
            return bool
        }
        if let string = dict[ApplePayKeys.allowOnboarding] as? String {
            return string.lowercased() == "true"
        }
        if let number = dict[ApplePayKeys.allowOnboarding] as? NSNumber {
            return number.boolValue
        }
        return false
    }

    var requiredShippingContactFields: Set<PKContactField> {
        guard let requiredFields = dict[ApplePayKeys.requiredShippingContactFields] as? [String] else {
            return []
        }
        return Set<PKContactField>(requiredFields.compactMap { PKContactField.fromString($0) })
    }

    var requiredBillingContactFields: Set<PKContactField> {
        guard let requiredFields = dict[ApplePayKeys.requiredBillingContactFields] as? [String] else {
            return []
        }
        return Set<PKContactField>(requiredFields.compactMap { PKContactField.fromString($0) })
    }

    var billingContact: PKContact? {
        guard let dictionary = dict[ApplePayKeys.billingContact] as? [String: Any] else {
            return nil
        }

        let contact = PKContact()

        if let phoneNumber = dictionary[ApplePayKeys.Contact.phoneNumber] as? String {
            contact.phoneNumber = CNPhoneNumber(stringValue: phoneNumber)
        }

        if let emailAddress = dictionary[ApplePayKeys.Contact.emailAddress] as? String {
            contact.emailAddress = emailAddress
        }

        var name = PersonNameComponents()
        var nameUodated = false
        if let givenName = dictionary[ApplePayKeys.Contact.givenName] as? String {
            name.givenName = givenName
            nameUodated = true
        }

        if let familyName = dictionary[ApplePayKeys.Contact.familyName] as? String {
            name.familyName = familyName
            nameUodated = true
        }

        if let phoneticGivenName = dictionary[ApplePayKeys.Contact.phoneticGivenName] as? String {
            name.phoneticRepresentation = PersonNameComponents()
            name.phoneticRepresentation?.givenName = phoneticGivenName
            nameUodated = true
        }

        if let phoneticFamilyName = dictionary[ApplePayKeys.Contact.phoneticFamilyName] as? String {
            name.phoneticRepresentation = name.phoneticRepresentation ?? PersonNameComponents()
            name.phoneticRepresentation?.familyName = phoneticFamilyName
            nameUodated = true
        }

        if nameUodated {
            contact.name = name
        }

        let postalAddress = CNMutablePostalAddress()
        var postalAddressUpdated = false
        if let addressLines = dictionary[ApplePayKeys.Contact.addressLines] as? [String] {
            postalAddress.street = addressLines.joined(separator: "\n")
            postalAddressUpdated = true
        }

        if let subLocality = dictionary[ApplePayKeys.Contact.subLocality] as? String {
            postalAddress.subLocality = subLocality
            postalAddressUpdated = true
        }

        if let locality = dictionary[ApplePayKeys.Contact.locality] as? String {
            postalAddress.city = locality
            postalAddressUpdated = true
        }

        if let postalCode = dictionary[ApplePayKeys.Contact.postalCode] as? String {
            postalAddress.postalCode = postalCode
            postalAddressUpdated = true
        }

        if let subAdministrativeArea = dictionary[ApplePayKeys.Contact.subAdministrativeArea] as? String {
            postalAddress.subAdministrativeArea = subAdministrativeArea
            postalAddressUpdated = true
        }

        if let administrativeArea = dictionary[ApplePayKeys.Contact.administrativeArea] as? String {
            postalAddress.state = administrativeArea
            postalAddressUpdated = true
        }

        if let country = dictionary[ApplePayKeys.Contact.country] as? String {
            postalAddress.country = country
            postalAddressUpdated = true
        }

        if let countryCode = dictionary[ApplePayKeys.Contact.countryCode] as? String {
            postalAddress.isoCountryCode = countryCode
            postalAddressUpdated = true
        }

        if postalAddressUpdated {
            contact.postalAddress = postalAddress
        }

        return contact
    }

    var shippingContact: PKContact? {
        guard let dictionary = dict[ApplePayKeys.shippingContact] as? [String: Any] else {
            return nil
        }

        let contact = PKContact()

        if let phoneNumber = dictionary[ApplePayKeys.Contact.phoneNumber] as? String {
            contact.phoneNumber = CNPhoneNumber(stringValue: phoneNumber)
        }

        if let emailAddress = dictionary[ApplePayKeys.Contact.emailAddress] as? String {
            contact.emailAddress = emailAddress
        }

        var name = PersonNameComponents()
        var nameUodated = false
        if let givenName = dictionary[ApplePayKeys.Contact.givenName] as? String {
            name.givenName = givenName
            nameUodated = true
        }

        if let familyName = dictionary[ApplePayKeys.Contact.familyName] as? String {
            name.familyName = familyName
            nameUodated = true
        }

        if let phoneticGivenName = dictionary[ApplePayKeys.Contact.phoneticGivenName] as? String {
            name.phoneticRepresentation = PersonNameComponents()
            name.phoneticRepresentation?.givenName = phoneticGivenName
            nameUodated = true
        }

        if let phoneticFamilyName = dictionary[ApplePayKeys.Contact.phoneticFamilyName] as? String {
            name.phoneticRepresentation = name.phoneticRepresentation ?? PersonNameComponents()
            name.phoneticRepresentation?.familyName = phoneticFamilyName
            nameUodated = true
        }

        if nameUodated {
            contact.name = name
        }

        let postalAddress = CNMutablePostalAddress()
        var postalAddressUpdated = false
        if let addressLines = dictionary[ApplePayKeys.Contact.addressLines] as? [String] {
            postalAddress.street = addressLines.joined(separator: "\n")
            postalAddressUpdated = true
        }

        if let subLocality = dictionary[ApplePayKeys.Contact.subLocality] as? String {
            postalAddress.subLocality = subLocality
            postalAddressUpdated = true
        }

        if let locality = dictionary[ApplePayKeys.Contact.locality] as? String {
            postalAddress.city = locality
            postalAddressUpdated = true
        }

        if let postalCode = dictionary[ApplePayKeys.Contact.postalCode] as? String {
            postalAddress.postalCode = postalCode
            postalAddressUpdated = true
        }

        if let subAdministrativeArea = dictionary[ApplePayKeys.Contact.subAdministrativeArea] as? String {
            postalAddress.subAdministrativeArea = subAdministrativeArea
            postalAddressUpdated = true
        }

        if let administrativeArea = dictionary[ApplePayKeys.Contact.administrativeArea] as? String {
            postalAddress.state = administrativeArea
            postalAddressUpdated = true
        }

        if let country = dictionary[ApplePayKeys.Contact.country] as? String {
            postalAddress.country = country
            postalAddressUpdated = true
        }

        if let countryCode = dictionary[ApplePayKeys.Contact.countryCode] as? String {
            postalAddress.isoCountryCode = countryCode
            postalAddressUpdated = true
        }

        if postalAddressUpdated {
            contact.postalAddress = postalAddress
        }

        return contact
    }

    var summaryItems: [PKPaymentSummaryItem]? {
        guard let items = dict[ApplePayKeys.summaryItems] as? [[String: Any]] else {
            return nil
        }

        var summaryItems = [PKPaymentSummaryItem]()
        for item in items {
            if let label = item[ApplePayKeys.SummeryItem.label] as? String,
               let value = item[ApplePayKeys.SummeryItem.amount] {
                let amount: NSDecimalNumber
                if let value = value as? String {
                    amount = NSDecimalNumber(string: value)
                } else if let value = value as? NSNumber {
                    amount = NSDecimalNumber(decimal: value.decimalValue)
                } else {
                    continue
                }
                if let typeRaw = item[ApplePayKeys.SummeryItem.type] as? String,
                   let type = ApplePayPaymentSummaryItemType(rawValue: typeRaw)?.toAppleType {
                    summaryItems.append(.init(label: label, amount: amount, type: type))
                } else {
                    summaryItems.append(.init(label: label, amount: amount))
                }
            }
        }
        return summaryItems.isEmpty ? nil : summaryItems
    }

    var shippingType: PKShippingType? {
        guard let type = dict[ApplePayKeys.shippingType] as? String else {  return nil }
        return ApplePayShippingType(rawValue: type)?.toAppleType
    }

    var supportedCountries: Set<String>? {
        guard let items = dict[ApplePayKeys.supportedCountries] as? [String] else {
            return nil
        }
        return .init(items)
    }

    var shippingMethods: [PKShippingMethod]? {
        guard let items = dict[ApplePayKeys.shippingMethods] as? [[String: Any]] else {
            return nil
        }

        var shippingMethods = [PKShippingMethod]()
        for item in items {
            if let label = item[ApplePayKeys.SummeryItem.label] as? String,
               let amounRaw = item[ApplePayKeys.SummeryItem.amount] {
                let amount: NSDecimalNumber
                if let value = amounRaw as? String {
                    amount = NSDecimalNumber(string: value)
                } else if let value = amounRaw as? NSNumber {
                    amount = NSDecimalNumber(decimal: value.decimalValue)
                } else {
                    continue
                }

                let shippingMethod: PKShippingMethod
                if let typeRaw = item[ApplePayKeys.SummeryItem.type] as? String,
                   let type = ApplePayPaymentSummaryItemType(rawValue: typeRaw)?.toAppleType {
                    shippingMethod = .init(label: label, amount: amount, type: type)
                } else {
                    shippingMethod = .init(label: label, amount: amount)
                }

                if let detail = item[ApplePayKeys.ShippingMethod.detail] as? String {
                    shippingMethod.detail = detail
                }

                if let identifier = item[ApplePayKeys.ShippingMethod.identifier] as? String {
                    shippingMethod.identifier = identifier
                }

                if #available(iOS 15.0, *),
                   let startRaw = item[ApplePayKeys.ShippingMethod.startDate] as? String,
                   let startDate = ISO8601DateFormatter().date(from: startRaw),
                   let endRaw = item[ApplePayKeys.ShippingMethod.endDate] as? String,
                   let endDate = ISO8601DateFormatter().date(from: endRaw) {
                    shippingMethod.dateComponentsRange = .init(start: startDate.toComponents,
                                                               end: endDate.toComponents)
                }

                shippingMethods.append(shippingMethod)
            }
        }
        return shippingMethods.isEmpty ? nil : shippingMethods
    }

    public func buildConfiguration(payment: Payment) throws -> Adyen.ApplePayComponent.Configuration {
        let paymentRequest = try buildPaymentRequest(payment: payment)
        return try .init(paymentRequest: paymentRequest, allowOnboarding: allowOnboarding)
    }

    internal func buildPaymentRequest(payment: Payment) throws -> PKPaymentRequest {
        guard let merchantID else {
            throw ApplePayError.invalidMerchantID
        }

        let summaryItems: [PKPaymentSummaryItem]
        if let summaryItemsFromConfig = self.summaryItems {
            summaryItems = summaryItemsFromConfig
        } else {
            guard let merchantName else {
                throw ApplePayError.invalidMerchantName
            }

            let amount = AmountFormatter.decimalAmount(payment.amount.value,
                                                       currencyCode: payment.amount.currencyCode,
                                                       localeIdentifier: payment.amount.localeIdentifier)
            summaryItems = [PKPaymentSummaryItem(label: merchantName, amount: amount)]
        }

        let paymentRequest = PKPaymentRequest()
        paymentRequest.merchantIdentifier = merchantID
        paymentRequest.paymentSummaryItems = summaryItems
        paymentRequest.countryCode = payment.countryCode
        paymentRequest.currencyCode = payment.amount.currencyCode
        paymentRequest.billingContact = billingContact
        paymentRequest.requiredShippingContactFields = requiredShippingContactFields
        paymentRequest.requiredBillingContactFields = requiredBillingContactFields
        paymentRequest.merchantCapabilities = [.capability3DS]
        paymentRequest.shippingContact = shippingContact
        paymentRequest.shippingType = shippingType ?? .shipping
        paymentRequest.supportedCountries = supportedCountries
        paymentRequest.shippingMethods = shippingMethods

        return paymentRequest
    }
}

enum ApplePayPaymentSummaryItemType: String {
    case final, pending

    var toAppleType: PKPaymentSummaryItemType {
        switch self {
        case .final:
            return .final
        case .pending:
            return .pending
        }
    }
}

extension ApplepayConfigurationParser {

    public enum ApplePayError: String, LocalizedError, KnownError {
        case invalidMerchantName
        case invalidMerchantID

        var errorCode: String {
            self.rawValue
        }

        public var errorDescription: String? {
            switch self {
            case .invalidMerchantName:
                return "Neither `summaryItems` nor `merchantName` in Apple Pay configuration"
            case .invalidMerchantID:
                return "No Apple Pay merchantID in configuration"
            }
        }
    }
}

enum ApplePayShippingType: String {
    case shipping
    case delivery
    case storePickup
    case servicePickup

    var toAppleType: PKShippingType {
        switch self {
        case .shipping:
            return .shipping
        case .delivery:
            return .delivery
        case .storePickup:
            return .storePickup
        case .servicePickup:
            return .servicePickup
        }
    }
}

extension PKContactField {

    /// 'postalAddress' | 'name' | 'phoneticName' | 'phone' | 'email'
    static func fromString(_ rawValue: String) -> PKContactField {
        switch rawValue {
        case "email", "emailAddress":
            return .emailAddress
        case "phone", "phoneNumber":
            return .phoneNumber
        case "post", "postalAddress":
            return .postalAddress
        case "name":
            return .name
        case "phoneticName":
            return .phoneticName
        default:
            return PKContactField(rawValue: rawValue)
        }
    }
}
