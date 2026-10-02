//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

extension PKShippingMethod {
    static func initiate(_ dictionary: [String: Any]) -> PKShippingMethod? {
        guard let label = dictionary[ApplePayKeys.SummaryItem.label] as? String,
              let amounRaw = dictionary[ApplePayKeys.SummaryItem.amount] else {
            return nil
        }

        let amount: NSDecimalNumber
        if let value = amounRaw as? String {
            amount = NSDecimalNumber(string: value)
        } else if let value = amounRaw as? NSNumber {
            amount = NSDecimalNumber(decimal: value.decimalValue)
        } else {
            return nil
        }

        let this: PKShippingMethod
        if let typeRaw = dictionary[ApplePayKeys.SummaryItem.type] as? String,
           let type = ApplePayPaymentSummaryItemType(rawValue: typeRaw)?.toAppleType {
            this = PKShippingMethod(label: label, amount: amount, type: type)
        } else {
            this = PKShippingMethod(label: label, amount: amount)
        }

        if let detail = dictionary[ApplePayKeys.ShippingMethod.detail] as? String {
            this.detail = detail
        }

        if let identifier = dictionary[ApplePayKeys.ShippingMethod.identifier] as? String {
            this.identifier = identifier
        }

        if #available(iOS 15.0, *),
           let startRaw = dictionary[ApplePayKeys.ShippingMethod.startDate] as? String,
           let startDate = iso8601Formatter.date(from: startRaw),
           let endRaw = dictionary[ApplePayKeys.ShippingMethod.endDate] as? String,
           let endDate = iso8601Formatter.date(from: endRaw) {
            this.dateComponentsRange = .init(start: startDate.toComponents,
                                             end: endDate.toComponents)
        }

        return this
    }

    var jsonObject: [String: Any] {
        var dict: [String: Any] = [
            ApplePayKeys.SummaryItem.label: label,
            ApplePayKeys.SummaryItem.amount: amount.stringValue,
            ApplePayKeys.SummaryItem.type: type == .pending ? "pending" : "final"
        ]
        if let identifier {
            dict[ApplePayKeys.ShippingMethod.identifier] = identifier
        }
        if let detail {
            dict[ApplePayKeys.ShippingMethod.detail] = detail
        }
        if #available(iOS 15.0, *), let range = dateComponentsRange {
            if let start = Calendar.current.date(from: range.startDateComponents) {
                dict[ApplePayKeys.ShippingMethod.startDate] = iso8601Formatter.string(from: start)
            }
            if let end = Calendar.current.date(from: range.endDateComponents) {
                dict[ApplePayKeys.ShippingMethod.endDate] = iso8601Formatter.string(from: end)
            }
        }
        return dict
    }
}

enum ApplePayShippingType: String {
    case shipping
    case delivery
    case storePickup
    case servicePickup

    var toAppleType: PKShippingType {
        switch self {
        case .shipping:
            return .shipping
        case .delivery:
            return .delivery
        case .storePickup:
            return .storePickup
        case .servicePickup:
            return .servicePickup
        }
    }
}

enum ApplePayMerchantCapability: String {
    case debit
    case credit

    var toAppleType: PKMerchantCapability {
        switch self {
        case .debit:
            return .debit
        case .credit:
            return .credit
        }
    }
}
