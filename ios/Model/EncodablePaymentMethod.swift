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
        var dict = [String: Any]()
        dict["name"] = name
        dict["type"] = type.rawValue

        if let it = self as? StoredPaymentMethod {
            dict["id"] = it.identifier
            dict["supportedShopperInteractions"] = it.supportedShopperInteractions.map { $0.rawValue }
        }
        if let it = self as? IssuerListPaymentMethod {
            dict["issuers"] = it.issuers.map { ["id": $0.identifier, "name": $0.name] }
        }
        if let it = self as? StoredCardPaymentMethod {
            dict["lastFour"] = it.lastFour
            dict["expiryYear"] = it.expiryYear
            dict["expiryMonth"] = it.expiryMonth
            dict["holderName"] = it.holderName
            dict["brand"] = it.brand.rawValue
        }
        if let it = self as? ApplePayPaymentMethod {
            dict["brands"] = it.brands
        }
        if let it = self as? GiftCardPaymentMethod {
            dict["brands"] = it.brand
        }
        if let it = self as? CardPaymentMethod {
            dict["brands"] = it.brands.map { $0.rawValue }
        }

        return dict
    }
}
