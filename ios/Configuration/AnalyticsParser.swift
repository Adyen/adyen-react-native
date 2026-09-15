//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen

public struct AnalyticsParser {

    private var dict: NSDictionary

    public init(configuration: NSDictionary) {
        if let configurationNode = configuration[AnalyticsKeys.rootKey] as? NSDictionary {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    public var analyticsOn: Bool {
        dict[AnalyticsKeys.enabled] as? Bool ?? true
    }

    public var verboseLogsOn: Bool {
        dict[AnalyticsKeys.verboseLogs] as? Bool == true
    }

    public var configuration: AnalyticsConfiguration {
        let analytics = AnalyticsConfiguration(isEnabled: analyticsOn)
        // TODO: `CheckoutPlatformParams` is `package`-scoped in the real Adyen module and can't
        // be reached across the vendored-xcframework boundary (see the podspec's
        // pod_target_xcconfig comment). Omitting this only affects Adyen's own analytics
        // attribution (reporting this SDK's usage as React Native rather than plain iOS), not
        // payment functionality.
        AdyenLogging.isEnabled = verboseLogsOn
        return analytics
    }

}
