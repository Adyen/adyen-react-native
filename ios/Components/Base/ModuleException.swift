//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2
import AdyenNetworking
import React
import UIKit

enum ModuleException: LocalizedError, KnownError {
    case canceled
    case noClientKey
    case invalidPaymentMethods
    case invalidClientKey

    var errorCode: String {
        switch self {
        case .canceled:
            return "canceledByShopper"
        case .noClientKey:
            return "noClientKey"
        case .invalidPaymentMethods:
            return "invalidPaymentMethods"
        case .invalidClientKey:
            return "invalidClientKey"
        }
    }

    var errorDescription: String? {
        switch self {
        case .canceled:
            return "Payment canceled by shopper"
        case .noClientKey:
            return "No clientKey in configuration"
        case .invalidClientKey:
            return "Invalid clientKey"
        case .invalidPaymentMethods:
            return "Can not parse paymentMethods or the list is empty"
        }
    }

    static func checkErrorType(_ error: Error) -> Error {
        if error.isComponentCanceled || error.is3DSCanceled {
            return ModuleException.canceled
        }
        if error.isEmpty401NetworkingResponseError {
            return ModuleException.invalidClientKey
        }
        return error
    }
}

extension Error {

    var isComponentCanceled: Bool {
        (self as? CheckoutError)?.code == .cancelled
    }

    var is3DSCanceled: Bool {
        (self as NSError).domain == "com.adyen.Adyen3DS2.ADYRuntimeError" &&
            (self as NSError).code == ADYRuntimeErrorCode.challengeCancelled.rawValue
    }

    var isEmpty401NetworkingResponseError: Bool {
        self is HTTPResponse<EmptyErrorResponse>
    }
}
