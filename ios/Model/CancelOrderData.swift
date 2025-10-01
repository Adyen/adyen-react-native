//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

internal struct CancelOrderData {
    let shouldUpdatePaymentMethods: Bool
    let order: PartialPaymentOrder

    var jsonObject: [String: Any] {
        [
            Key.shouldUpdatePaymentMethods: shouldUpdatePaymentMethods,
            Key.order: order.jsonObject
        ]
    }

    private enum Key {
        static let shouldUpdatePaymentMethods = "shouldUpdatePaymentMethods"
        static let order = "order"
    }
}
