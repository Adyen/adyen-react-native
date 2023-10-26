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
        guard let requredFields = dict[ApplePayKeys.requiredShippingContactFields] as? [String] else {
            return []
        }
        return Set<PKContactField>(requredFields.compactMap { PKContactField.fromString($0) })
    }
    
    var requiredBillingContactFields: Set<PKContactField> {
        guard let requredFields = dict[ApplePayKeys.requiredBillingContactFields] as? [String] else {
            return []
        }
        return Set<PKContactField>(requredFields.compactMap { PKContactField.fromString($0) })
    }
    
    var billingContact: PKContact? {
        guard let dictionary = dict[ApplePayKeys.billingContact] as? [String: Any] else {
            return nil
        }
        
        let contact = PKContact()
        
        if let phoneNumber = dictionary[ApplePayKeys.PKContactKeys.phoneNumber] as? String {
            contact.phoneNumber = CNPhoneNumber(stringValue: phoneNumber)
        }
        
        if let emailAddress = dictionary[ApplePayKeys.PKContactKeys.emailAddress] as? String {
            contact.emailAddress = emailAddress
        }
        
        var name = PersonNameComponents()
        var nameUodated = false
        if let givenName = dictionary[ApplePayKeys.PKContactKeys.givenName] as? String {
            name.givenName = givenName
            nameUodated = true
        }
        
        if let familyName = dictionary[ApplePayKeys.PKContactKeys.familyName] as? String {
            name.familyName = familyName
            nameUodated = true
        }
        
        if let phoneticGivenName = dictionary[ApplePayKeys.PKContactKeys.phoneticGivenName] as? String {
            name.phoneticRepresentation = PersonNameComponents()
            name.phoneticRepresentation?.givenName = phoneticGivenName
            nameUodated = true
        }
        
        if let phoneticFamilyName = dictionary[ApplePayKeys.PKContactKeys.phoneticFamilyName] as? String {
            name.phoneticRepresentation = name.phoneticRepresentation ?? PersonNameComponents()
            name.phoneticRepresentation?.familyName = phoneticFamilyName
            nameUodated = true
        }
        
        if nameUodated {
            contact.name = name
        }
        
        let postalAddress = CNMutablePostalAddress()
        var postalAddressUpdated = false
        if let addressLines = dictionary[ApplePayKeys.PKContactKeys.addressLines] as? [String] {
            postalAddress.street = addressLines.joined(separator: "\n")
            postalAddressUpdated = true
        }
        
        if let subLocality = dictionary[ApplePayKeys.PKContactKeys.subLocality] as? String {
            postalAddress.subLocality = subLocality
            postalAddressUpdated = true
        }
        
        if let locality = dictionary[ApplePayKeys.PKContactKeys.locality] as? String {
            postalAddress.city = locality
            postalAddressUpdated = true
        }
        
        if let postalCode = dictionary[ApplePayKeys.PKContactKeys.postalCode] as? String {
            postalAddress.postalCode = postalCode
            postalAddressUpdated = true
        }
        
        if let subAdministrativeArea = dictionary[ApplePayKeys.PKContactKeys.subAdministrativeArea] as? String {
            postalAddress.subAdministrativeArea = subAdministrativeArea
            postalAddressUpdated = true
        }
        
        if let administrativeArea = dictionary[ApplePayKeys.PKContactKeys.administrativeArea] as? String {
            postalAddress.state = administrativeArea
            postalAddressUpdated = true
        }
        
        if let country = dictionary[ApplePayKeys.PKContactKeys.country] as? String {
            postalAddress.country = country
            postalAddressUpdated = true
        }
        
        if let countryCode = dictionary[ApplePayKeys.PKContactKeys.countryCode] as? String {
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
            if let label = item[ApplePayKeys.summaryItemsLabel] as? String,
               let value = item[ApplePayKeys.summaryItemsValue] ?? item[ApplePayKeys.deprecated_summaryItemsValue] {
                if let value = value as? String {
                    summaryItems.append(.init(label: label, amount: NSDecimalNumber(string: value)))
                } else if let value = value as? NSNumber {
                    summaryItems.append(.init(label: label, amount: NSDecimalNumber(decimal: value.decimalValue)))
                }
            }
        }
        return summaryItems.isEmpty ? nil : summaryItems
    }

    public func buildConfiguration(amount: Amount) throws -> Adyen.ApplePayComponent.Configuration {
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
            
            let amount = AmountFormatter.decimalAmount(amount.value,
                                                       currencyCode: amount.currencyCode,
                                                       localeIdentifier: amount.localeIdentifier)
            summaryItems = [PKPaymentSummaryItem(label: merchantName, amount: amount)]
        }
        
        return .init(summaryItems: summaryItems,
                     merchantIdentifier: merchantID,
                     requiredBillingContactFields: requiredBillingContactFields,
                     requiredShippingContactFields: requiredShippingContactFields,
                     billingContact: billingContact,
                     allowOnboarding: allowOnboarding
        )
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
