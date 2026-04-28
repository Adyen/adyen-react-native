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

        var defaultOptions: InstallmentConfiguration.Options?
        var cardBasedConfigurations: [InstallmentConfiguration.CardConfiguration] = []

        for (key, value) in installmentOptionsDict {
            guard let keyString = key as? String,
                  let optionDict = value as? NSDictionary,
                  let valuesArray = optionDict["values"] as? [Int] else {
                continue
            }

            let plansArray = optionDict["plans"] as? [String] ?? []
            let includeRevolving = plansArray.contains("revolving")

            if keyString.lowercased() == "card" {
                // Default options for all cards
                defaultOptions = InstallmentConfiguration.Options(
                    monthValues: valuesArray,
                    includesRevolving: includeRevolving
                )
            } else {
                // Card-specific options
                let cardType = CardType(rawValue: keyString)
                cardBasedConfigurations.append(
                    InstallmentConfiguration.CardConfiguration(
                        cardType: cardType,
                        installmentOptions: InstallmentConfiguration.Options(
                            monthValues: valuesArray,
                            includesRevolving: includeRevolving
                        )
                    )
                )
            }
        }

        // Return configuration only if we have at least one option
        guard defaultOptions != nil || !cardBasedConfigurations.isEmpty else {
            return nil
        }

        return InstallmentConfiguration(
            defaultOptions: defaultOptions,
            cardBasedConfigurations: cardBasedConfigurations
        )
    }

    public var configuration: CardComponent.Configuration {
        .init(style: FormComponentStyle(),
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

        switch value {
        case "show":
            return .show
        default:
            return .hide
        }
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
