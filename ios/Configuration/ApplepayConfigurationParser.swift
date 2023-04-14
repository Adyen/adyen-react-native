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
        if let configurationNode = configuration[ApplePayKeys.rootKey] as? [String: Any] {
            self.dict = configurationNode
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

    var allowOnboarding: Bool {
        return dict[ApplePayKeys.allowOnboarding] as? Bool ?? false
    }

    public func buildConfiguration(amount: Amount) throws -> Adyen.ApplePayComponent.Configuration {
        guard let merchantID = merchantID else {
            throw ApplePayError.invalidMerchantID
        }
        
        guard let merchantName = merchantName else {
            throw ApplePayError.invalidMerchantName
        }

        let amount = AmountFormatter.decimalAmount(amount.value,
                                                   currencyCode: amount.currencyCode,
                                                   localeIdentifier: amount.localeIdentifier)
        return .init(summaryItems: [PKPaymentSummaryItem(label: merchantName, amount: amount)],
                     merchantIdentifier: merchantID,
                     allowOnboarding: allowOnboarding)
    }

}

extension ApplepayConfigurationParser {
    
    internal enum ApplePayError: String, LocalizedError, KnownError {
        case invalidMerchantName
        case invalidMerchantID
        
        var errorCode: String {
            self.rawValue
        }
        
        var errorDescription: String? {
            switch self {
            case .invalidMerchantName:
                return "No Apple Pay merchantName in configuration"
            case .invalidMerchantID:
                return "No Apple Pay merchantID in configuration"
            }
        }
    }
    
}

