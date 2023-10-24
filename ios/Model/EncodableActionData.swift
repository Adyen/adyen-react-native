//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

internal struct EncodableActionData: Encodable {
    let data: ActionComponentData

    internal func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(data.details.encodable, forKey: .details)
        try container.encode(data.paymentData, forKey: .paymentData)
    }

    private enum CodingKeys: String, CodingKey {
        case details
        case paymentData
    }
}

internal extension ActionComponentData {
    var jsonObject: [String: Any] {
        EncodableActionData(data: self).jsonDictionary
    }
}
