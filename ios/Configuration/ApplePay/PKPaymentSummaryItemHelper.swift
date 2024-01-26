//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

extension PKPaymentSummaryItem {
    convenience init?(_ dictionary: [String: Any]) {
        guard let label = dictionary[ApplePayKeys.SummeryItem.label] as? String,
              let value = dictionary[ApplePayKeys.SummeryItem.amount] else {
            return nil
        }
        let amount: NSDecimalNumber
        if let value = value as? String {
            amount = NSDecimalNumber(string: value)
        } else if let value = value as? NSNumber {
            amount = NSDecimalNumber(decimal: value.decimalValue)
        } else {
            return nil
        }
        if let typeRaw = dictionary[ApplePayKeys.SummeryItem.type] as? String,
           let type = ApplePayPaymentSummaryItemType(rawValue: typeRaw)?.toAppleType {
            self.init(label: label, amount: amount, type: type)
        } else {
            self.init(label: label, amount: amount)
        }
    }
}

enum ApplePayPaymentSummaryItemType: String {
    case final, pending

    var toAppleType: PKPaymentSummaryItemType {
        switch self {
        case .final:
            return .final
        case .pending:
            return .pending
        }
    }
}
