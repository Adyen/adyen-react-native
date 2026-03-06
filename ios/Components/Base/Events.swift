//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal enum Events: String, CaseIterable {
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

    static var coreEvents: [Events] {
        [.fail, .submit, .additionalDetails, .complete]
    }

    static var sessionEvents: [Events] {
        [.failSession, .completeSession]
    }

    static var addressLookupEvents: [Events] {
        [.confirmAddress, .updateAddress]
    }

    static var cardEvents: [Events] {
        [.binLookup, .changeBinValue]
    }

    static var dropInEvents: [Events] {
        [.requestOrder, .cancelOrder, .checkBalance, .disableStoredPaymentMethod]
    }
}
