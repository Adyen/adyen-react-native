//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

/// The session context returned to JavaScript after a v6 ``SessionCheckout`` is set up.
struct SessionDTO {
    let id: String
    let sessionData: String
    let paymentMethods: [String: Any]

    init(id: String, sessionData: String, paymentMethods: PaymentMethods) {
        self.id = id
        self.sessionData = sessionData
        self.paymentMethods = paymentMethods.jsonObject
    }

    var jsonObject: [String: Any] {
        [
            "id": id,
            "sessionData": sessionData,
            "paymentMethods": paymentMethods
        ]
    }
}
