//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


import Foundation

extension Date {
    var toComponents: DateComponents {
        Calendar.current.dateComponents([.calendar, .year, .month, .day], from: self)
    }
}

var iso8601Formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withFullDate]
    return formatter
}()
