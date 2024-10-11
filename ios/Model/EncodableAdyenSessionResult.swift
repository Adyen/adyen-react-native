//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

extension AdyenSessionResult: Encodable {
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(self.resultCode.rawValue, forKey: .resultCode)
    }

    private enum CodingKeys: String, CodingKey {
        case resultCode
    }
}
