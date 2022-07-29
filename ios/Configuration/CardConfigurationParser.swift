//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct CardConfigurationParser {

    private var dict: [String:Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configuration = configuration[CardKeys.rootKey] as? [String: Any] {
            self.dict = configuration
        } else {
            self.dict = configuration
        }
    }

    var showsStorePaymentMethodField: Bool {
        dict[CardKeys.showStorePaymentField] as? Bool ?? true
    }

    var showsHolderNameField: Bool {
        dict[CardKeys.holderNameRequired] as? Bool ?? false
    }

    var showsSecurityCodeField: Bool {
        guard let value = dict[CardKeys.hideCvc] as? Bool else {
            return true
        }
        return !value
    }

    var showsStoredSecurityCodeField: Bool {
        guard let value = dict[CardKeys.hideCvcStoredCard] as? Bool else {
            return true
        }
        return !value
    }

    var addressVisibility: CardComponent.AddressFormType {
        guard let value = dict[CardKeys.addressVisibility] as? String else {
            return .none
        }

        switch value.lowercased() {
        case "postal", "postalcode", "postal_code":
            return .postalCode
        default:
            return .none
        }
    }

    var kcpVisibility: CardComponent.FieldVisibility {
        guard let value = dict[CardKeys.addressVisibility] as? String else {
            return .hide
        }

        switch value {
        case "show":
            return .show
        default:
            return .hide
        }
    }

    public var configuration: CardComponent.Configuration {
        var storedConfiguration = StoredCardConfiguration()
        storedConfiguration.showsSecurityCodeField = showsStoredSecurityCodeField

        return  .init(showsHolderNameField: showsHolderNameField,
                      showsStorePaymentMethodField: showsStorePaymentMethodField,
                      showsSecurityCodeField: showsSecurityCodeField,
                      koreanAuthenticationMode: kcpVisibility,
                      billingAddressMode: addressVisibility,
                      storedCardConfiguration: storedConfiguration)
//                      socialSecurityNumberMode: CardComponent.FieldVisibility,
//                      allowedCardTypes: [CardType]?,
//                      installmentConfiguration: InstallmentConfiguration?,
//                      billingAddressCountryCodes: [String]?)
    }

}

extension CardComponent.AddressFormType {

    internal init(rawValue: String) {
        switch rawValue.lowercased() {
        case "postalcode", "postal_code", "postal":
            self = .postalCode
        case "full":
            self = .full
        default:
            self = .none
        }
    }

}
