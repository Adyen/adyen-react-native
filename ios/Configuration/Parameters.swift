//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

protocol SubConfig {
    static var rootKey: String { get }
}

internal enum RootKeys {
    static let environment = "environment"
    static let clientKey = "clientKey"
    static let amount = "amount"
    static let value = "value"
    static let countryCode = "countryCode"
    static let currency = "currency"
    static let locale = "locale"
}

internal enum AnalyticsKeys: SubConfig {
    static let rootKey = "analytics"
    static let enabled = "enabled"
    static let verboseLogs = "verboseLogs"
}

internal enum DropInKeys: SubConfig {
    static let rootKey = "dropin"
    static let showPreselectedStoredPaymentMethod = "showPreselectedStoredPaymentMethod"
    static let skipListWhenSinglePaymentMethod = "skipListWhenSinglePaymentMethod"
    static let showRemovePaymentMethodButton = "showRemovePaymentMethodButton"
    static let title = "title"
}

internal enum CardKeys: SubConfig {
    static let rootKey = "card"
    static let showStorePaymentField = "showStorePaymentField"
    static let holderNameRequired = "holderNameRequired"
    static let hideCvcStoredCard = "hideCvcStoredCard"
    static let hideCvc = "hideCvc"
    static let addressVisibility = "addressVisibility"
    static let kcpVisibility = "kcpVisibility"
    static let socialSecurity = "socialSecurity"
    static let allowedCardTypes = "supported"
    static let billingAddressCountryCodes = "allowedAddressCountryCodes"
    static let installmentOptions = "installmentOptions"

    enum Installment {
        static let values = "values"
        static let plans = "plans"
        static let defaultKey = "card"
        static let revolvingPlan = "revolving"
    }
}

internal enum ApplePayKeys: SubConfig {
    static let rootKey = "applepay"
    static let merchantID = "merchantID"
    static let merchantName = "merchantName"
    static let allowOnboarding = "allowOnboarding"
    static let summaryItems = "summaryItems"
    static let requiredBillingContactFields = "requiredBillingContactFields"
    static let requiredShippingContactFields = "requiredShippingContactFields"
    static let billingContact = "billingContact"
    static let shippingContact = "shippingContact"
    static let shippingType = "shippingType"
    static let supportedCountries = "supportedCountries"
    static let shippingMethods = "shippingMethods"
    static let recurringPaymentRequest = "recurringPaymentRequest"

    enum Recurring {
        static let paymentDescription = "description"
        static let regularBilling = "regularBilling"
        static let managementURL = "managementURL"

        static let billingAgreement = "billingAgreement"
        static let trialBilling = "trialBilling"
        static let tokenNotificationURL = "tokenNotificationURL"
    }

    enum Contact {
        static let phoneNumber = "phoneNumber"
        static let emailAddress = "emailAddress"
        static let givenName = "givenName"
        static let familyName = "familyName"
        static let phoneticGivenName = "phoneticGivenName"
        static let phoneticFamilyName = "phoneticFamilyName"
        static let addressLines = "addressLines"
        static let subLocality = "subLocality"
        static let locality = "locality"
        static let postalCode = "postalCode"
        static let subAdministrativeArea = "subAdministrativeArea"
        static let administrativeArea = "administrativeArea"
        static let country = "country"
        static let countryCode = "countryCode"
    }

    enum SummaryItem {
        static let label = "label"
        static let amount = "amount"
        static let type = "type"
    }

    enum ShippingMethod {
        static let identifier = "identifier"
        static let detail = "detail"
        static let dateComponentsRange = "dateComponentsRange"
        static let startDate = "startDate"
        static let endDate = "endDate"
    }

    enum RecurringPaymentSummaryItem {
        static let label = "label"
        static let amount = "amount"

        static let startDate = "startDate"
        static let endDate = "endDate"
        static let intervalUnit = "intervalUnit"
        static let intervalCount = "intervalCount"
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

internal enum PartialPaymentKey: SubConfig {
    static let rootKey = "partialPayment"
    static let pinRequired = "pinRequired"
}

internal enum StyleKeys: SubConfig {
    static let rootKey = "style"
}

internal enum ThreeDSKey: SubConfig {
    static let rootKey = "threeDS2"
    static let requestorAppUrl = "requestorAppUrl"
}
