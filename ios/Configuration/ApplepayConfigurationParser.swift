//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

public struct ApplepayConfigurationParser {

    private var dict: [String:Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configuration = configuration[ApplePayKeys.rootKey] as? [String: Any] {
            self.dict = configuration
        } else {
            self.dict = configuration
        }
    }

    var merchantID: String? {
        return dict[ApplePayKeys.merchantID] as? String
    }

    var merchantName: String? {
        return dict[ApplePayKeys.merchantName] as? String
    }

    public func tryConfiguration(amount: Amount) -> ApplePayComponent.Configuration? {
        guard let merchantName = merchantName, let merchantID = merchantID else {
            return nil
        }

        let amount = AmountFormatter.decimalAmount(amount.value,
                                                   currencyCode: amount.currencyCode,
                                                   localeIdentifier: amount.localeIdentifier)
        return .init(summaryItems: [PKPaymentSummaryItem(label: merchantName, amount: amount)],
                     merchantIdentifier: merchantID,
                     allowOnboarding: false)
//                     requiredBillingContactFields: Set<PKContactField>,
//                     requiredShippingContactFields: Set<PKContactField>,
//                     billingContact: PKContact?,
    }

}
