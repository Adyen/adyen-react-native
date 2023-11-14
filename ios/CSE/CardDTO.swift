//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

extension EncryptedCard: Encodable {
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try? container.encodeIfPresent(number, forKey: .number)
        try? container.encodeIfPresent(expiryYear, forKey: .expiryYear)
        try? container.encodeIfPresent(expiryMonth, forKey: .expiryMonth)
        try? container.encodeIfPresent(securityCode, forKey: .securityCode)
    }
    
    private enum CodingKeys: String, CodingKey {
        case number, expiryYear, expiryMonth
        case securityCode = "cvv"
    }
}

extension Card: Decodable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        try self.init(number: container.decodeIfPresent(String.self, forKey: .number),
                      securityCode: container.decodeIfPresent(String.self, forKey: .securityCode),
                      expiryMonth: container.decodeIfPresent(String.self, forKey: .expiryMonth),
                      expiryYear: container.decodeIfPresent(String.self, forKey: .expiryYear))
    }
    
    private enum CodingKeys: String, CodingKey {
        case number, expiryYear, expiryMonth
        case securityCode = "cvv"
    }
}
