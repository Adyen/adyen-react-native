//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

protocol SubConfig {
    static var rootKey: String { get }
}

internal enum Events: String, CaseIterable {
    case didSubmit = "didSubmitCallback"
    case didProvide = "didProvideCallback"
    case didComplete = "didCompleteCallback"
    case didFail = "didFailCallback"
}

internal enum Keys {
    static var environment = "environment"
    static var clientKey = "clientKey"
    static var amount = "amount"
    static var value = "value"
    static var countryCode = "countryCode"
    static var currency = "currency"
    static var shopperLocale = "shopperLocale"
}

internal enum AnalyticsKeys: SubConfig {
    static var rootKey = "analytics"
    static var enabled = "enabled"
}

internal enum DropInKeys: SubConfig {
    static var rootKey = "dropin"
    static var showPreselectedStoredPaymentMethod = "showPreselectedStoredPaymentMethod"
    static var skipListWhenSinglePaymentMethod = "skipListWhenSinglePaymentMethod"
}

internal enum CardKeys: SubConfig {
    static var rootKey = "card"
    static var showStorePaymentField = "showStorePaymentField"
    static var holderNameRequired = "holderNameRequired"
    static var hideCvcStoredCard = "hideCvcStoredCard"
    static var hideCvc = "hideCvc"
    static var addressVisibility = "addressVisibility"
    static var kcpVisibility = "kcpVisibility"
    static var socialSecurity = "socialSecurity"
    static var allowedCardTypes = "supported"
    static var billingAddressCountryCodes = "allowedAddressCountryCodes"
}

internal enum ApplePayKeys: SubConfig {
    static var rootKey = "applepay"
    static var merchantID = "merchantID"
    static var merchantName = "merchantName"
    static var allowOnboarding = "allowOnboarding"
    static var summaryItems = "summaryItems"
    static var requiredBillingContactFields = "requiredBillingContactFields"
    static var requiredShippingContactFields = "requiredShippingContactFields"
    static var billingContact = "billingContact"
    static var shippingContact = "shippingContact"
    static var shippingType = "shippingType"
    static var supportedCountries = "supportedCountries"
    static var shippingMethods = "shippingMethods"

    enum Contact {
        static var phoneNumber = "phoneNumber"
        static var emailAddress = "emailAddress"
        static var givenName = "givenName"
        static var familyName = "familyName"
        static var phoneticGivenName = "phoneticGivenName"
        static var phoneticFamilyName = "phoneticFamilyName"
        static var addressLines = "addressLines"
        static var subLocality = "subLocality"
        static var locality = "locality"
        static var postalCode = "postalCode"
        static var subAdministrativeArea = "subAdministrativeArea"
        static var administrativeArea = "administrativeArea"
        static var country = "country"
        static var countryCode = "countryCode"
    }

    enum SummeryItem {
        static var label = "label"
        static var amount = "amount"
        static var type = "type"
    }

    enum ShippingMethod {
        static var identifier = "identifier"
        static var detail = "detail"
        static var dateComponentsRange = "dateComponentsRange"
        static var startDate = "startDate"
        static var endDate = "endDate"
    }
}

internal enum StyleKeys: SubConfig {
    static var rootKey = "style"
}
