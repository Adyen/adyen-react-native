//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

internal struct EncodablePaymentComponentData: Encodable {
    let data: PaymentComponentData

    internal func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        try container.encode(data.paymentMethod.encodable, forKey: .details)
        try container.encode(data.storePaymentMethod, forKey: .storePaymentMethod)
        try container.encodeIfPresent(data.browserInfo, forKey: .browserInfo)
        try container.encodeIfPresent(data.shopperName, forKey: .shopperName)
        try container.encodeIfPresent(data.emailAddress, forKey: .shopperEmail)
        try container.encodeIfPresent(data.telephoneNumber, forKey: .telephoneNumber)
        try container.encodeIfPresent(data.billingAddress, forKey: .billingAddress)
        try container.encodeIfPresent(data.deliveryAddress, forKey: .deliveryAddress)
        try container.encodeIfPresent(data.socialSecurityNumber, forKey: .socialSecurityNumber)
        try container.encodeIfPresent(data.order?.compactOrder, forKey: .order)
        try container.encodeIfPresent(data.installments, forKey: .installments)
        try container.encodeIfPresent(data.amount, forKey: .amount)
    }

    private enum CodingKeys: String, CodingKey {
        case details = "paymentMethod"
        case storePaymentMethod
        case browserInfo
        case shopperName
        case shopperEmail
        case telephoneNumber
        case billingAddress
        case deliveryAddress
        case socialSecurityNumber
        case order
        case installments
        case amount
    }
}

internal extension PaymentComponentData {
    var jsonObject: [String: Any] {
        EncodablePaymentComponentData(data: self).jsonDictionary
    }
}