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
