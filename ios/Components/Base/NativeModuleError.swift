//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

enum NativeModuleError: LocalizedError, KnownError {
    case canceled
    case noClientKey
    case noPayment
    case notSupported
    case invalidPaymentMethods
    case invalidAction
    case notKeyWindow
    case paymentMethodNotFound(String)
    case balanceCheck(message: String)
    case orderRequest(message: String)

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
        }
    }
}
