//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

let creditCardDictionary: NSDictionary = [
    "type": "scheme",
    "name": "Credit Card",
    "fundingSource": "credit",
    "brands": ["mc", "visa", "amex"]
]

let payPalDictionary: NSDictionary = [
    "name": "PayPal",
    "supportsRecurring": true,
    "type": "paypal"
]

let applePayDictionary: NSDictionary = [
    "type": "applepay",
    "name": "Apple Pay",
    "brands": ["mc", "visa"]
]

let configuration: NSDictionary = [
    "clientKey": "test_clientkey",
    "amount": [
        "value": 1000,
        "currency": "USD"
    ],
    "countryCode": "US",
    "applepay": [
        "merchantID": "merchant.com.adyen.test",
        "merchantName": "Test Merchant"
    ]
]
