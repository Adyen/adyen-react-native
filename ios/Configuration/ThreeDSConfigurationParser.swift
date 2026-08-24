//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

public struct ThreeDS2ConfigurationParser {

    private var dict: NSDictionary

    public init(configuration: NSDictionary) {
        if let configurationNode = configuration[ThreeDSKey.rootKey] as? NSDictionary {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    var requestorAppUrl: String? {
        dict[ThreeDSKey.requestorAppUrl] as? String
    }

    public var configuration: AuthenticationConfiguration {
        var configuration = AuthenticationConfiguration()
        if let requestorAppUrl, let url = URL(string: requestorAppUrl) {
            configuration = configuration.requestorAppURL(url)
        }
        return configuration
    }
}
