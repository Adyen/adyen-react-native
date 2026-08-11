//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

/// An amount paired with the country in which it is charged.
///
/// v6 removed the `Adyen.Payment` type (the amount now lives on `CheckoutConfiguration`), but the
/// bridge still needs the amount and country code together to build Apple Pay `PKPaymentRequest`s.
public struct Payment {
    public let amount: Amount
    public let countryCode: String

    public init(amount: Amount, countryCode: String) {
        self.amount = amount
        self.countryCode = countryCode
    }
}
