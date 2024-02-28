//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

extension PKShippingMethod {
    static func initiate(_ dictionary: [String: Any]) -> PKShippingMethod? {
        guard let label = dictionary[ApplePayKeys.SummeryItem.label] as? String,
              let amounRaw = dictionary[ApplePayKeys.SummeryItem.amount] else {
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
        if let typeRaw = dictionary[ApplePayKeys.SummeryItem.type] as? String,
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
