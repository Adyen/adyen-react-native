//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal protocol KnownError: Error {
    var errorCode: String { get }
}

internal enum Key {
    static let message = "message"
    static let errorCode = "errorCode"
    static let reason = "reason"
    static let description = "description"
    static let recovery = "recovery"
}

internal extension Swift.Error {

    var jsonObject: [String: Any] {
        var dict = [Key.message: self.localizedDescription]

        if let localized = self as? LocalizedError {
            dict[Key.reason] = localized.failureReason
            dict[Key.description] = localized.errorDescription
            dict[Key.recovery] = localized.recoverySuggestion
        }

        if let knownError = self as? KnownError {
            dict[Key.errorCode] = knownError.errorCode
        }

        return dict
    }
}
