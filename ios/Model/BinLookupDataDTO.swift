//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

internal struct BinLookupDataDTO: Codable {
    var brand: String

    private enum CodingKeys: String, CodingKey {
        case brand
    }
}
