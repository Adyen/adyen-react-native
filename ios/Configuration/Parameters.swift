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
    case didUpdateAddress = "didUpdateAddressCallback"
    case didConfirmAddress = "didConfirmAddressCallback"
    case didDisableStoredPaymentMethod = "didDisableStoredPaymentMethodCallback"

    static var coreEvents: [Events] { [.didFail, .didSubmit, .didProvide, .didComplete] }
}

internal enum Keys {
    static var environment = "environment"
    static var clientKey = "clientKey"
    static var amount = "amount"
    static var value = "value"
    static var countryCode = "countryCode"
    static var currency = "currency"
    static var locale = "locale"
}

internal enum AnalyticsKeys: SubConfig {
    static var rootKey = "analytics"
    static var enabled = "enabled"
    static var verboseLogs = "verboseLogs"
}

internal enum DropInKeys: SubConfig {
    static var rootKey = "dropin"
    static var showPreselectedStoredPaymentMethod = "showPreselectedStoredPaymentMethod"
    static var skipListWhenSinglePaymentMethod = "skipListWhenSinglePaymentMethod"
    static var showRemovePaymentMethodButton = "showRemovePaymentMethodButton"
    static var title = "title"
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
    static var recurringPaymentRequest="recurringPaymentRequest"

    enum Recurring {
        static var paymentDescription = "description"
        static var regularBilling = "regularBilling"
        static var managementURL = "managementURL"

        static var billingAgreement = "billingAgreement"
        static var trialBilling = "trialBilling"
        static var tokenNotificationURL = "tokenNotificationURL"
    }

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

    enum RecurringPaymentSummaryItem {
        static var label = "label"
        static var amount = "amount"

        static var startDate = "startDate"
        static var endDate = "endDate"
        static var intervalUnit = "intervalUnit"
        static var intervalCount = "intervalCount"
    }

    enum CalendarUnit: String {
        case minute, hour, day, month, year

        var systemValue: NSCalendar.Unit {
            switch self {
            case .minute:
                return .minute
            case .hour:
                return .hour
            case .day:
                return .day
            case .month:
                return .month
            case .year:
                return .year
            }
        }
    }
}

internal enum StyleKeys: SubConfig {
    static var rootKey = "style"
}

internal enum ThreeDSKey: SubConfig {
    static var rootKey = "threeDS2"
    static var requestorAppUrl = "requestorAppUrl"
}
