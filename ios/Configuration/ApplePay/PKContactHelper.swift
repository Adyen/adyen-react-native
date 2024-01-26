//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

extension PKContact {
    convenience init?(_ dictionary: [String: Any]) {
        self.init()

        if let phoneNumber = dictionary[ApplePayKeys.Contact.phoneNumber] as? String {
            self.phoneNumber = CNPhoneNumber(stringValue: phoneNumber)
        }

        if let emailAddress = dictionary[ApplePayKeys.Contact.emailAddress] as? String {
            self.emailAddress = emailAddress
        }

        self.name = extractName(dictionary)
        self.postalAddress = extractedAddress(dictionary)
    }

    private func extractName(_ dictionary: [String: Any]) -> PersonNameComponents? {
        var name = PersonNameComponents()
        var nameUpdated = false
        if let givenName = dictionary[ApplePayKeys.Contact.givenName] as? String {
            name.givenName = givenName
            nameUpdated = true
        }

        if let familyName = dictionary[ApplePayKeys.Contact.familyName] as? String {
            name.familyName = familyName
            nameUpdated = true
        }

        if let phoneticGivenName = dictionary[ApplePayKeys.Contact.phoneticGivenName] as? String {
            name.phoneticRepresentation = PersonNameComponents()
            name.phoneticRepresentation?.givenName = phoneticGivenName
            nameUpdated = true
        }

        if let phoneticFamilyName = dictionary[ApplePayKeys.Contact.phoneticFamilyName] as? String {
            name.phoneticRepresentation = name.phoneticRepresentation ?? PersonNameComponents()
            name.phoneticRepresentation?.familyName = phoneticFamilyName
            nameUpdated = true
        }

        return nameUpdated ? name : nil
    }

    private func extractedAddress(_ dictionary: [String: Any]) -> CNMutablePostalAddress? {
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

        return postalAddressUpdated ? postalAddress : nil
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
