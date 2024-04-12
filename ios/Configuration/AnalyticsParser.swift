//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen

public struct AnalyticsParser {

    private var dict: [String: Any]

    init(configuration: [String: Any]) {
        self.init(configuration: configuration as NSDictionary)
    }

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configurationNode = configuration[AnalyticsKeys.rootKey] as? [String: Any] {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    public var analyticsOn: Bool {
        return dict[AnalyticsKeys.enabled] as? Bool == true
    }

    public var verboseLogsOn: Bool {
        return dict[AnalyticsKeys.verboseLogs] as? Bool == true
    }

    public var configuration: AnalyticsConfiguration {
        var analytics = AnalyticsConfiguration()
        analytics.isEnabled = analyticsOn
        analytics.context = TelemetryContext(version: AdyenSDKVersion, platform: .reactNative)
        AdyenLogging.isEnabled = verboseLogsOn
        return analytics
    }

}
