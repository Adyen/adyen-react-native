//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

internal struct EncodablePaymentMethod: Encodable {
    let paymentMethod: PaymentMethod

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(paymentMethod.name, forKey: .name)
        try container.encode(paymentMethod.type, forKey: .type)
    }

    public enum CodingKeys: CodingKey {
        case name
        case type
    }
}

internal extension PaymentMethod {
    var jsonObject: [String: Any] {
        EncodablePaymentMethod(paymentMethod: self).jsonObject
    }
}
