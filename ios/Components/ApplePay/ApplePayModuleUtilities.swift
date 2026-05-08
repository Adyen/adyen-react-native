import Adyen
import Contacts
import PassKit

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

extension ApplePayPaymentMethod {

    internal var supportedNetworks: [PKPaymentNetwork] {
        var networks = PKPaymentRequest.availableNetworks()
        if let brands {
            let brandsSet = Set(brands)
            networks = networks.filter { brandsSet.contains($0.txVariantName) }
        }
        return networks
    }

}

extension PKPaymentNetwork {

    internal var txVariantName: String {
        switch self {
        case .masterCard: return "mc"
        case .cartesBancaires: return "cartebancaire"
        default: return self.rawValue.lowercased()
        }
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
    guard let type = dict["type"] as? String,
          let message = dict["message"] as? String else { return nil }
    switch type {
    case "shippingAddress":
        let key = postalAddressKey(for: dict["field"] as? String)
        return PKPaymentRequest.paymentShippingAddressInvalidError(withKey: key, localizedDescription: message)
    case "billingAddress":
        let key = postalAddressKey(for: dict["field"] as? String)
        return PKPaymentRequest.paymentBillingAddressInvalidError(withKey: key, localizedDescription: message)
    case "contactField":
        let field = contactField(for: dict["field"] as? String)
        return PKPaymentRequest.paymentContactInvalidError(withContactField: field, localizedDescription: message)
    case "couponCodeExpired":
        if #available(iOS 15.0, *) {
            return PKPaymentRequest.paymentCouponCodeExpiredError(localizedDescription: message)
        }
        return nil
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

private func contactField(for field: String?) -> PKContactField {
    switch field {
    case "phoneNumber", "phone": return .phoneNumber
    case "emailAddress", "email": return .emailAddress
    case "name": return .name
    case "phoneticName": return .phoneticName
    case "postalAddress": return .postalAddress
    default: return PKContactField(rawValue: field ?? "")
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
