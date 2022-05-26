//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

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
    static var applepayMerchantID = "applepayMerchantID"
    static var skipListWhenSinglePaymentMethod = "skipListWhenSinglePaymentMethod"
    static var showStorePaymentField = "showStorePaymentField"
    static var holderNameRequired = "holderNameRequired"
    static var hideCvcStoredCard = "hideCvcStoredCard"
    static var showPreselectedStoredPaymentMethod = "showPreselectedStoredPaymentMethod"
}
