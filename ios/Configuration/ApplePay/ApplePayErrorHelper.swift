//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Contacts
import PassKit

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
