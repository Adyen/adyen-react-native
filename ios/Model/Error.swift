//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal protocol KnownError: Error {
    var errorCode: String { get }
}

internal enum Keys {
    static let message = "message"
    static let errorCode = "errorCode"
    static let reason = "reason"
    static let description = "description"
    static let recovery = "recovery"
}

internal extension Swift.Error {

    var jsonObject: [String: Any] {
        var dict = [Keys.message: self.localizedDescription]

        if let localized = self as? LocalizedError {
            dict[Keys.reason] = localized.failureReason
            dict[Keys.description] = localized.errorDescription
            dict[Keys.recovery] = localized.recoverySuggestion
        }

        if let knownError = self as? KnownError {
            dict[Keys.errorCode] = knownError.errorCode
        }

        return dict
    }
}

extension NSDictionary? {
    var getErrorMessage: String {
        self?.value(forKey: Keys.message) as? String ?? "Unknown"
    }
}
