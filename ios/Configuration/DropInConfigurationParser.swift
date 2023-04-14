//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct DropInConfigurationParser {

    private var dict: [String:Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configurationNode = configuration[DropInKeys.rootKey] as? [String: Any] {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    var showPreselectedStoredPaymentMethod: Bool {
        guard let value = dict[DropInKeys.showPreselectedStoredPaymentMethod] as? Bool else {
            return true
        }
        return value
    }

    var skipListWhenSinglePaymentMethod: Bool {
        guard let value = dict[DropInKeys.skipListWhenSinglePaymentMethod] as? Bool else {
            return true
        }
        return value
    }

    public func configuration(apiContext: APIContext) -> DropInComponent.Configuration {
        return .init(apiContext: apiContext,
                     allowsSkippingPaymentList: skipListWhenSinglePaymentMethod,
                     allowPreselectedPaymentView: showPreselectedStoredPaymentMethod)
    }

}
