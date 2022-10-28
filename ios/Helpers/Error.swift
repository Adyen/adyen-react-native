//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal protocol KnownError: Error {
    var errorCode: String { get }
}

internal enum Parameter {
    static let message = "message"
    static let errorCode = "errorCode"
    static let reason = "reason"
    static let description = "description"
    static let recovery = "recovery"
}

internal extension Swift.Error {

    var toDictionary: [String: Any] {
        var dict = [Parameter.message: self.localizedDescription]

        if let localized = self as? LocalizedError {
            dict[Parameter.reason] = localized.failureReason
            dict[Parameter.description] = localized.errorDescription
            dict[Parameter.recovery] = localized.recoverySuggestion
        }

        if let knownError = self as? KnownError {
            dict[Parameter.errorCode] = knownError.errorCode
        }

        return dict
    }
}
