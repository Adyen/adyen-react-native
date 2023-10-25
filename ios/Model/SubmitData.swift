//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal struct SubmitData {
    let paymentData: [String : Any]
    let extra: [String : Any]?

    var jsonObject: [String: Any] {
        [
            Key.paymentData: paymentData,
            Key.extra: extra
        ]
    }
    
    private enum Key {
        static let paymentData = "paymentData"
        static let extra = "extra"
    }
}