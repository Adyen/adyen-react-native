//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

protocol SubConfig {
    static var rootKey: String { get }
}

extension Dictionary where Key == String {
    func hasConfig(_ keys: SubConfig.Type) -> Bool {
        return self[keys.rootKey] != nil
    }
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

internal enum DropInKeys: SubConfig {
    static var rootKey = "dropin";
    static var showPreselectedStoredPaymentMethod = "showPreselectedStoredPaymentMethod";
    static var skipListWhenSinglePaymentMethod = "skipListWhenSinglePaymentMethod";
}

internal enum CardKeys: SubConfig {
    static var rootKey = "card"
    static var showStorePaymentField = "showStorePaymentField";
    static var holderNameRequired = "holderNameRequired";
    static var hideCvcStoredCard = "hideCvcStoredCard";
    static var hideCvc = "hideCvc";
    static var addressVisibility = "addressVisibility";
    static var kcpVisibility = "kcpVisibility";
}

internal enum ApplePayKeys: SubConfig {
    static var rootKey = "applepay"
    
    static var merchantID = "merchantID"
    static var merchantName = "merchantName"
}

internal enum StyleKeys: SubConfig {
    static var rootKey = "style"
}
