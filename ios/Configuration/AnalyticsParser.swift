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
        var analytics = AnalyticsConfiguration()
        analytics.isEnabled = analyticsOn
        analytics.context = AnalyticsContext(version: adyenSDKVersion, platform: .reactNative)
        AdyenLogging.isEnabled = verboseLogsOn
        return analytics
    }

}
