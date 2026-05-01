//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal struct InstallmentConfigurationParser {

    private let dict: NSDictionary
    private let showInstallmentAmount: Bool

    internal init(configuration: NSDictionary, showInstallmentAmount: Bool = false) {
        self.dict = configuration
        self.showInstallmentAmount = showInstallmentAmount
    }

    var installmentConfiguration: InstallmentConfiguration? {
        var defaultOptions: InstallmentOptions?
        var cardBasedConfigurations: [CardType: InstallmentOptions] = [:]

        for (key, value) in dict {
            guard let keyString = key as? String,
                  let optionDict = value as? NSDictionary,
                  let valuesArray = (optionDict[CardKeys.Installment.values] as? [NSNumber])?.map({ UInt(truncating: $0) }) else {
                continue
            }

            let plansArray = optionDict[CardKeys.Installment.plans] as? [String] ?? []
            let includeRevolving = plansArray.contains(CardKeys.Installment.revolvingPlan)

            if keyString.lowercased() == CardKeys.Installment.defaultKey {
                // Default options for all cards
                defaultOptions = InstallmentOptions(
                    monthValues: valuesArray,
                    includesRevolving: includeRevolving
                )
            } else {
                // Card-specific options
                let cardType = CardType(rawValue: keyString)
                cardBasedConfigurations[cardType] =
                    InstallmentOptions(
                        monthValues: valuesArray,
                        includesRevolving: includeRevolving
                    )
            }
        }

        // Return configuration only if we have at least one option
        switch (defaultOptions, cardBasedConfigurations.isEmpty) {
        case let (.some(options), false):
            // Both defaultOptions and cardBasedOptions
            return InstallmentConfiguration(
                cardBasedOptions: cardBasedConfigurations,
                defaultOptions: options,
                showInstallmentAmount: showInstallmentAmount
            )
        case let (.some(options), true):
            // Only defaultOptions
            return InstallmentConfiguration(
                defaultOptions: options,
                showInstallmentAmount: showInstallmentAmount
            )
        case (.none, false):
            // Only cardBasedOptions
            return InstallmentConfiguration(
                cardBasedOptions: cardBasedConfigurations,
                showInstallmentAmount: showInstallmentAmount
            )
        case (.none, true):
            // Neither - return nil
            return nil
        }
    }

}
