//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct DropInConfigurationParser {

    private var dict: [String: Any]

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

    var showRemovePaymentMethodButton: Bool {
        guard let value = dict[DropInKeys.showRemovePaymentMethodButton] as? Bool else {
            return false
        }
        return value
    }

    var title: String? {
        dict[DropInKeys.title] as? String
    }

    public var configuration: DropInComponent.Configuration {
        let configuration = DropInComponent.Configuration(allowsSkippingPaymentList: skipListWhenSinglePaymentMethod,
                                                                 allowPreselectedPaymentView: showPreselectedStoredPaymentMethod)
        configuration.paymentMethodsList.allowDisablingStoredPaymentMethods = showRemovePaymentMethodButton
        return configuration
    }

}
