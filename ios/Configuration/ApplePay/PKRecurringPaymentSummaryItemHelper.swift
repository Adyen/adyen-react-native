//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import PassKit

@available(iOS 15.0, *)
extension PKRecurringPaymentSummaryItem {

    convenience init?(_ dictionary: [NSString: Any]) {
        guard let label = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.label as NSString] as? String,
              let amount = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.amount as NSString] as? NSNumber else {
            self.init()
            return
        }
        self.init(label: label, amount: NSDecimalNumber(value: amount.doubleValue))
        if let startDateRaw = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.startDate as NSString] as? String,
           let startDate = iso8601Formatter.date(from: startDateRaw) {
            self.startDate = startDate
        }
        if let endDateRaw = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.endDate as NSString] as? String,
           let endDate = iso8601Formatter.date(from: endDateRaw) {
            self.endDate = endDate
        }
        if let intervalUnitRaw = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.intervalUnit as NSString] as? String,
           let intervalUnit = ApplePayKeys.CalendarUnit(rawValue: intervalUnitRaw) {
            self.intervalUnit = intervalUnit.systemValue
        }
        if let intervalCount = dictionary[ApplePayKeys.RecurringPaymentSummaryItem.intervalCount as NSString] as? NSNumber {
            self.intervalCount = intervalCount.intValue
        }
    }
}


/*
 static var label = "label"
 static var amount = "amount"
 static var type = "type"

 static var startDate = "startDate"
 static var endDate = "endDate"
 static var intervalUnit = "intervalUnit"
 static var intervalCount = "intervalCount"
 */
