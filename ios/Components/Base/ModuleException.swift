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
    case noPayment
    case notSupported
    case invalidPaymentMethods
    case invalidAction
    case notKeyWindow
    case paymentMethodNotFound(PaymentMethod.Type)
    case balanceCheck(message: String)
    case orderRequest(message: String)
    case sessionError
    case invalidClientKey
    case componentNotRegistered(String)

    var errorCode: String {
        switch self {
        case .canceled:
            return "canceledByShopper"
        case .notSupported:
            return "notSupported"
        case .noClientKey:
            return "noClientKey"
        case .noPayment:
            return "noPayment"
        case .invalidPaymentMethods:
            return "invalidPaymentMethods"
        case .invalidAction:
            return "invalidAction"
        case .paymentMethodNotFound:
            return "noPaymentMethod"
        case .notKeyWindow:
            return "notKeyWindow"
        case .balanceCheck:
            return "balanceCheck"
        case .orderRequest:
            return "orderRequest"
        case .sessionError:
            return "sessionError"
        case .invalidClientKey:
            return "invalidClientKey"
        case .componentNotRegistered:
            return "componentNotRegistered"
        }
    }

    var errorDescription: String? {
        switch self {
        case .canceled:
            return "Payment canceled by shopper"
        case .notSupported:
            return "Not supported on iOS"
        case .noClientKey:
            return "No clientKey in configuration"
        case .invalidClientKey:
            return "Invalid clientKey"
        case .noPayment:
            return "No payment in configuration"
        case .invalidPaymentMethods:
            return "Can not parse paymentMethods or the list is empty"
        case .invalidAction:
            return "Can not parse action"
        case let .paymentMethodNotFound(type):
            return "Can not find payment method of type \(type) in provided list"
        case .notKeyWindow:
            return "Can not find root ViewController"
        case let .balanceCheck(message):
            return "Balance check error: \(message)"
        case let .orderRequest(message):
            return "Order request error: \(message)"
        case .sessionError:
            return "Something went wrong while starting session"
        case let .componentNotRegistered(type):
            return "No embedded component registered for type \(type)"
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
