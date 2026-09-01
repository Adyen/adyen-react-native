//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

public struct CardConfigurationParser {

    public typealias AddressLookupHandler = (String) async -> [AddressLookupResult]
    public typealias AddressCompletionHandler = (AddressLookupResult) async throws -> PostalAddress
    public typealias BinChangeHandler = (String) -> Void
    public typealias BinLookupHandler = (BinLookupData) -> Void

    private var dict: NSDictionary
    private let onAddressLookup: AddressLookupHandler?
    private let onAddressSelected: AddressCompletionHandler?
    private let onBinChange: BinChangeHandler?
    private let onBinLookup: BinLookupHandler?

    public init(
        configuration: NSDictionary,
        onAddressLookup: AddressLookupHandler? = nil,
        onAddressSelected: AddressCompletionHandler? = nil,
        onBinChange: BinChangeHandler? = nil,
        onBinLookup: BinLookupHandler? = nil
    ) {
        self.onAddressLookup = onAddressLookup
        self.onAddressSelected = onAddressSelected
        self.onBinChange = onBinChange
        self.onBinLookup = onBinLookup
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

    var billingAddressMode: BillingAddressMode {
        guard let value = (dict[CardKeys.addressVisibility] as? String)?.lowercased() else {
            return .none
        }

        switch value {
        case "postalcode", "postal_code", "postal":
            return .postalCode()
        case "full":
            return .full(supportedCountryCodes: billingAddressCountryCodes ?? [])
        case "lookup":
            guard let onAddressLookup else {
                return .full(supportedCountryCodes: billingAddressCountryCodes ?? [])
            }
            return .lookup(onAddressLookup: onAddressLookup, onAddressSelected: onAddressSelected)
        default:
            return .none
        }
    }

    var kcpVisibility: CardConfiguration.FieldVisibility {
        parseVisibility(CardKeys.kcpVisibility)
    }

    var socialSecurityVisibility: CardConfiguration.FieldVisibility {
        parseVisibility(CardKeys.socialSecurity)
    }

    var supportedCardBrands: [CardBrand]? {
        guard let strings = dict[CardKeys.allowedCardTypes] as? [String], !strings.isEmpty else {
            return nil
        }

        return strings.map { CardBrand(rawValue: $0) }
    }

    var billingAddressCountryCodes: [String]? {
        guard let strings = dict[CardKeys.billingAddressCountryCodes] as? [String], !strings.isEmpty else {
            return nil
        }
        return strings
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

    public var configuration: CardConfiguration {
        var configuration = CardConfiguration()
            .showCardholderName(showsHolderNameField)
            .showStorePaymentMethod(showsStorePaymentMethodField)
            .showSecurityCode(showsSecurityCodeField)
            .showSecurityCodeForStoredCard(showsStoredSecurityCodeField)
            .koreanAuthenticationVisibility(kcpVisibility)
            .socialSecurityNumberVisibility(socialSecurityVisibility)
            .billingAddressMode(billingAddressMode)

        if let supportedCardBrands {
            configuration = configuration.supportedCardBrands(supportedCardBrands)
        }

        if let installmentConfiguration {
            configuration = configuration.installmentConfiguration(installmentConfiguration)
        }

        if let onBinChange {
            configuration = configuration.onBinChange(onBinChange)
        }

        if let onBinLookup {
            configuration = configuration.onBinLookup(onBinLookup)
        }

        return configuration
    }

    private func parseVisibility(_ key: String) -> CardConfiguration.FieldVisibility {
        guard let value = dict[key] as? String else {
            return .hide
        }

        return value == "show" ? .show : .hide
    }

}
