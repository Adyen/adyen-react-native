//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal enum EventName: String, CaseIterable {
    case submit = "didSubmitCallback"
    case additionalDetails = "didProvideCallback"
    case complete = "didCompleteCallback"
    case fail = "didFailCallback"
    case updateAddress = "didUpdateAddressCallback"
    case confirmAddress = "didConfirmAddressCallback"
    case disableStoredPaymentMethod = "didDisableStoredPaymentMethodCallback"
    case checkBalance = "didCheckBalanceCallback"
    case requestOrder = "didRequestOrderCallback"
    case cancelOrder = "didCancelOrderCallback"
    case binLookup = "didBinLookupCallback"
    case changeBinValue = "didChangeBinValueCallback"
    case completeSession = "didSessionCompleteCallback"
    case failSession = "didSessionErrorCallback"
    case authorizePayment = "didAuthorizePaymentCallback"

    static var coreEvents: [EventName] {
        [.fail, .submit, .additionalDetails, .complete]
    }

    static var sessionEvents: [EventName] {
        [.failSession, .completeSession]
    }

    static var addressLookupEvents: [EventName] {
        [.confirmAddress, .updateAddress]
    }

    static var cardEvents: [EventName] {
        [.binLookup, .changeBinValue]
    }

    static var dropInEvents: [EventName] {
        [.requestOrder, .cancelOrder, .checkBalance, .disableStoredPaymentMethod]
    }

    static var applePayEvents: [EventName] {
        [.authorizePayment]
    }
}
