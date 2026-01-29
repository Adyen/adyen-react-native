//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen

public struct RootConfigurationParser {

    private var configuration: NSDictionary

    public init(configuration: NSDictionary) {
        self.configuration = configuration
    }

    public var environment: Environment {
        guard let environmentString = configuration[RootKeys.environment] as? String else {
            return .test
        }
        return Environment.parse(environmentString)
    }

    public var clientKey: String? {
        configuration[RootKeys.clientKey] as? String
    }

    public var amount: Amount? {
        guard let paymentObject = configuration[RootKeys.amount] as? [String: Any],
              let paymentAmount = Int.tryCast(paymentObject[RootKeys.value]),
              let currencyCode = paymentObject[RootKeys.currency] as? String
        else {
            return nil
        }

        return Amount(value: paymentAmount, currencyCode: currencyCode)
    }

    public var countryCode: String? {
        configuration[RootKeys.countryCode] as? String
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
        configuration[RootKeys.locale] as? String
    }
}

extension RootConfigurationParser {

    internal func fetchContext(session: AdyenSession?) throws -> AdyenContext {
        guard let clientKey = self.clientKey else {
            throw NativeModuleError.noClientKey
        }

        guard ClientKeyValidator().isValid(clientKey) else {
            throw NativeModuleError.invalidClientKey
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
