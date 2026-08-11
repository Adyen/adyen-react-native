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

    /// Builds a v6 ``CheckoutConfiguration`` from the parsed root configuration.
    ///
    /// Component configurations (card, Apple Pay, authentication, etc.) are supplied
    /// through the DSL `content` builder by the calling module.
    /// - Parameters:
    ///   - amount: An amount that overrides the one parsed from the configuration (for example, a
    ///     session amount). When `nil`, the amount parsed from the configuration is used.
    ///   - content: The component configuration builder.
    internal func checkoutConfiguration(
        amount: Amount? = nil,
        @CheckoutConfigurationBuilder content: () throws -> CheckoutConfigurable
    ) throws -> CheckoutConfiguration {
        guard let clientKey = self.clientKey else {
            throw ModuleException.noClientKey
        }

        let analytics = AnalyticsParser(configuration: configuration).configuration

        let config = try CheckoutConfiguration(
            environment: environment,
            amount: amount ?? self.amount,
            clientKey: clientKey,
            analyticsConfiguration: analytics,
            content: content
        )

        guard let theme = AdyenAppearanceLoader.findStyle() else {
            return config
        }
        return config.theme(theme)
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
