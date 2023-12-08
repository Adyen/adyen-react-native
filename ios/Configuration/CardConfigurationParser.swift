//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct CardConfigurationParser {

    private var dict: [String: Any]

    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configurationNode = configuration[CardKeys.rootKey] as? [String: Any] {
            self.dict = configurationNode
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

        return .init(rawValue: value)
    }

    var kcpVisibility: CardComponent.FieldVisibility {
        parseVisibility(CardKeys.kcpVisibility)
    }
    
    var socialSecurityVisibility: CardComponent.FieldVisibility {
        parseVisibility(CardKeys.socialSecurity)
    }
    
    var allowedCardTypes: [CardType]? {
        guard let strings = dict[CardKeys.allowedCardTypes] as? [String], !strings.isEmpty else {
            return nil
        }
        
        return strings.map { CardType(rawValue: $0) }
    }

    var billingAddressCountryCodes: [String]? {
        guard let strings = dict[CardKeys.billingAddressCountryCodes] as? [String], !strings.isEmpty else {
            return nil
        }
        return strings
    }
    
    // TODO: add installmentConfiguration: InstallmentConfiguration?
    
    public var configuration: CardComponent.Configuration {
        var storedConfiguration = StoredCardConfiguration()
        storedConfiguration.showsSecurityCodeField = showsStoredSecurityCodeField

        var billingAddressConfiguration = BillingAddressConfiguration()
        billingAddressConfiguration.countryCodes = billingAddressCountryCodes
        billingAddressConfiguration.mode = addressVisibility

        var soredCardConfiguration = StoredCardConfiguration()
        return .init(style: FormComponentStyle(),
                     shopperInformation: nil,
                     localizationParameters: nil,
                     showsHolderNameField: showsHolderNameField,
                     showsStorePaymentMethodField: showsStorePaymentMethodField,
                     showsSecurityCodeField: showsSecurityCodeField,
                     koreanAuthenticationMode: kcpVisibility,
                     socialSecurityNumberMode: socialSecurityVisibility,
                     storedCardConfiguration: soredCardConfiguration,
                     allowedCardTypes: allowedCardTypes,
                     installmentConfiguration:nil,
                     billingAddress: billingAddressConfiguration )
    }

    public var dropinConfiguration: DropInComponent.Card {
        var storedConfiguration = StoredCardConfiguration()
        storedConfiguration.showsSecurityCodeField = showsStoredSecurityCodeField

        var billingAddressConfiguration = BillingAddressConfiguration()
        billingAddressConfiguration.countryCodes = billingAddressCountryCodes
        billingAddressConfiguration.mode = addressVisibility

        var soredCardConfiguration = StoredCardConfiguration()
        return .init(showsHolderNameField: showsHolderNameField,
                     showsStorePaymentMethodField: showsStorePaymentMethodField,
                     showsSecurityCodeField: showsSecurityCodeField,
                     koreanAuthenticationMode: kcpVisibility,
                     socialSecurityNumberMode: socialSecurityVisibility,
                     storedCardConfiguration: soredCardConfiguration,
                     allowedCardTypes: allowedCardTypes,
                     installmentConfiguration:nil,
                     billingAddress: billingAddressConfiguration )
    }

    private func parseVisibility(_ key: String) -> CardComponent.FieldVisibility {
        guard let value = dict[key] as? String else {
            return .hide
        }

        switch value {
        case "show":
            return .show
        default:
            return .hide
        }
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
