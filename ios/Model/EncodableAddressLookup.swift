//
// Copyright (c) 2024 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import Adyen

extension LookupAddressModel: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let identifier = try container.decode(String.self, forKey: .identifier)
        let postalAddress = try container.decode(PostalAddress.self, forKey: .postalAddress)

        self = .init(identifier: identifier, postalAddress: postalAddress)
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        try container.encode(identifier, forKey: .identifier)
        try container.encode(postalAddress, forKey: .postalAddress)
    }

    private enum CodingKeys: String, CodingKey {
        case identifier
        case postalAddress
    }
}

extension PostalAddress: Codable {
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let city = try container.decodeIfPresent(String.self, forKey: .city)
        let country = try container.decodeIfPresent(String.self, forKey: .country)
        let houseNumberOrName = try container.decodeIfPresent(String.self, forKey: .houseNumberOrName)
        let postalCode = try container.decodeIfPresent(String.self, forKey: .postalCode)
        let stateOrProvince = try container.decodeIfPresent(String.self, forKey: .stateOrProvince)
        let street = try container.decodeIfPresent(String.self, forKey: .street)

        self = .init(city: city,
                     country: country,
                     houseNumberOrName: houseNumberOrName,
                     postalCode: postalCode,
                     stateOrProvince: stateOrProvince,
                     street: street)
    }

    private enum CodingKeys: String, CodingKey {
        case city
        case country
        case houseNumberOrName
        case postalCode
        case stateOrProvince
        case street
    }
}
