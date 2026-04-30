//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal struct InstallmentConfigurationParser {

    private let dict: NSDictionary

    internal init(configuration: NSDictionary) {
        self.dict = configuration
    }

    var installmentConfiguration: InstallmentConfiguration? {
        var defaultOptions: InstallmentOptions?
        var cardBasedConfigurations: [CardType: InstallmentOptions] = [:]

        for (key, value) in dict {
            guard let keyString = key as? String,
                  let optionDict = value as? NSDictionary,
                  let valuesArray = optionDict["values"] as? [UInt] else {
                continue
            }

            let plansArray = optionDict["plans"] as? [String] ?? []
            let includeRevolving = plansArray.contains("revolving")

            if keyString.lowercased() == "card" {
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
        guard defaultOptions != nil || !cardBasedConfigurations.isEmpty else {
            return nil
        }

        return InstallmentConfiguration(
            cardBasedOptions: cardBasedConfigurations,
            defaultOptions: defaultOptions,
            showInstallmentAmount: true
        )
    }

}
