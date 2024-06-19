//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

internal extension Encodable {
    var jsonObject: [String: Any] {
        guard let data = try? JSONEncoder().encode(self),
              let object = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            return [:]
        }

        return object
    }
}

internal extension Decodable {
    init(from jsonObject: NSDictionary) throws {
        let data = try JSONSerialization.data(withJSONObject: jsonObject, options: [])
        self = try JSONDecoder().decode(Self.self, from: data)
    }
}

internal extension NSDictionary {
    func toJson<T: Decodable>() throws -> T {
        let data = try JSONSerialization.data(withJSONObject: self, options: [])
        return try JSONDecoder().decode(T.self, from: data)
    }
}
