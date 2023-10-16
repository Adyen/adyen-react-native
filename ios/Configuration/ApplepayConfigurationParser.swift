//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

public struct ApplepayConfigurationParser {

    private var dict: [String: Any]

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
        dict[ApplePayKeys.merchantID] as? String
    }

    var merchantName: String? {
        dict[ApplePayKeys.merchantName] as? String
    }

    var allowOnboarding: Bool {
        dict[ApplePayKeys.allowOnboarding] as? Bool ?? false
    }
    
    var summaryItems: [PKPaymentSummaryItem]? {
        guard let items = dict[ApplePayKeys.summaryItems] as? [[String: Any]] else {
            return nil
        }
        
        var summaryItems = [PKPaymentSummaryItem]()
        for item in items {
            if let label = item[ApplePayKeys.summaryItemsLabel] as? String,
               let value = item[ApplePayKeys.summaryItemsValue] {
                if let value = value as? String {
                    summaryItems.append(.init(label: label, amount: NSDecimalNumber(string: value)))
                } else if let value = value as? Double {
                    summaryItems.append(.init(label: label, amount: NSDecimalNumber(value: value)))
                }
            }
        }
        return summaryItems.isEmpty ? nil : summaryItems
    }

    public func buildConfiguration(amount: Amount) throws -> Adyen.ApplePayComponent.Configuration {
        guard let merchantID else {
            throw ApplePayError.invalidMerchantID
        }
        
        let summaryItems: [PKPaymentSummaryItem]
        if let summaryItemsFromConfig = self.summaryItems {
            summaryItems = summaryItemsFromConfig
        } else {
            guard let merchantName else {
                throw ApplePayError.invalidMerchantName
            }
            
            let amount = AmountFormatter.decimalAmount(amount.value,
                                                       currencyCode: amount.currencyCode,
                                                       localeIdentifier: amount.localeIdentifier)
            summaryItems = [PKPaymentSummaryItem(label: merchantName, amount: amount)]
            
        }
        return .init(summaryItems: summaryItems,
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
                return "Neither `summaryItems` nor `merchantName` in Apple Pay configuration"
            case .invalidMerchantID:
                return "No Apple Pay merchantID in configuration"
            }
        }
    }
    
}
