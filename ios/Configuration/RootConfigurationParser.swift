//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct RootConfigurationParser {

    private var configuration: NSDictionary

    public init(configuration: NSDictionary) {
        self.configuration = configuration
    }

    public var environment: Environment {
        guard let environmentString = configuration[Keys.environment] as? String else {
            return .test
        }
        return Environment.parse(environmentString)
    }

    public var clientKey: String? {
        configuration[Keys.clientKey] as? String
    }

    public var amount: Amount? {
        guard let paymentObject = configuration[Keys.amount] as? [String: Any],
              let paymentAmount = Int.tryCast(paymentObject[Keys.value]),
              let currencyCode = paymentObject[Keys.currency] as? String
        else {
            return nil
        }

        return Amount(value: paymentAmount, currencyCode: currencyCode)
    }

    public var countryCode: String? {
        configuration[Keys.countryCode] as? String
    }

    public var payment: Payment? {
        guard let amount = self.amount,
              let countryCode
        else {
            return nil
        }

        return Payment(amount: amount, countryCode: countryCode)
    }

    public var shopperLocale: String? {
        configuration[Keys.locale] as? String
    }
}

extension RootConfigurationParser {

    internal func fetchContext(session: AdyenSession?) throws -> AdyenContext {
        guard let clientKey = self.clientKey else {
            throw NativeModuleError.noClientKey
        }
        let apiContext = try APIContext(environment: self.environment, clientKey: clientKey)

        let analytics = AnalyticsParser(configuration: configuration).configuration

        var payment: Payment?
        if
            let context = session?.sessionContext,
            let countryCode = context.countryCode ?? self.countryCode {
            payment = Payment(amount: context.amount, countryCode: countryCode)
        } else {
            payment = self.payment
        }

        return AdyenContext(apiContext: apiContext, payment: payment, analyticsConfiguration: analytics)
    }
}

extension Int {
    static func tryCast(_ any: Any?) -> Int? {
        switch any {
        case is Int:
            return any as? Int
        case is String:
            return Int(any as! String)
        case is NSNumber:
            return (any as! NSNumber).intValue
        default:
            return nil
        }
    }
}
