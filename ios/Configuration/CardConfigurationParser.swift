//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct CardConfigurationParser {

    private var dict: NSDictionary
    private unowned var delegate: AddressLookupProvider

    public init(configuration: NSDictionary, delegate: AddressLookupProvider) {
        self.delegate = delegate
        if let configurationNode = configuration[CardKeys.rootKey] as? NSDictionary {
            self.dict = configurationNode
        } else {
            self.dict = configuration
        }
    }

    var showsStorePaymentMethodField: Bool {
        dict[CardKeys.showStorePaymentField] as? Bool ?? true
    }

    var showsSubmitButton: Bool {
        dict[CardKeys.showSubmitButton] as? Bool ?? true
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

        return .init(rawValue: value, delegate: delegate)
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

    var storedCardConfiguration: StoredCardConfiguration {
        var storedCardConfiguration = StoredCardConfiguration()
        storedCardConfiguration.showsSecurityCodeField = showsStoredSecurityCodeField
        return storedCardConfiguration
    }

    var billingAddressConfiguration: BillingAddressConfiguration {
        var billingAddressConfiguration = BillingAddressConfiguration()
        billingAddressConfiguration.countryCodes = billingAddressCountryCodes
        billingAddressConfiguration.mode = addressVisibility
        return billingAddressConfiguration
    }

    var installmentConfiguration: InstallmentConfiguration? {
        guard let installmentOptionsDict = dict[CardKeys.installmentOptions] as? NSDictionary else {
            return nil
        }

        let showInstallmentAmount = dict[CardKeys.showInstallmentAmount] as? Bool ?? false
        return InstallmentConfigurationParser(
            configuration: installmentOptionsDict,
            showInstallmentAmount: showInstallmentAmount
        ).installmentConfiguration
    }

    public var configuration: CardComponent.Configuration {
        .init(style: FormComponentStyle(),
              showsSubmitButton: showsSubmitButton,
              shopperInformation: nil,
              localizationParameters: nil,
              showsHolderNameField: showsHolderNameField,
              showsStorePaymentMethodField: showsStorePaymentMethodField,
              showsSecurityCodeField: showsSecurityCodeField,
              koreanAuthenticationMode: kcpVisibility,
              socialSecurityNumberMode: socialSecurityVisibility,
              storedCardConfiguration: storedCardConfiguration,
              allowedCardTypes: allowedCardTypes,
              installmentConfiguration: installmentConfiguration,
              billingAddress: billingAddressConfiguration)
    }

    public var dropinConfiguration: DropInComponent.Card {
        .init(showsHolderNameField: showsHolderNameField,
              showsStorePaymentMethodField: showsStorePaymentMethodField,
              showsSecurityCodeField: showsSecurityCodeField,
              koreanAuthenticationMode: kcpVisibility,
              socialSecurityNumberMode: socialSecurityVisibility,
              storedCardConfiguration: storedCardConfiguration,
              allowedCardTypes: allowedCardTypes,
              installmentConfiguration: installmentConfiguration,
              billingAddress: billingAddressConfiguration)
    }

    private func parseVisibility(_ key: String) -> CardComponent.FieldVisibility {
        guard let value = dict[key] as? String else {
            return .hide
        }

        return value == "show" ? .show : .hide
    }

}

extension CardComponent.AddressFormType {

    internal init(rawValue: String, delegate: AddressLookupProvider) {
        switch rawValue.lowercased() {
        case "postalcode", "postal_code", "postal":
            self = .postalCode
        case "full":
            self = .full
        case "lookup":
            self = .lookup(provider: delegate)
        default:
            self = .none
        }
    }

}
