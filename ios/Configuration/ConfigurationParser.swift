//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import PassKit

public struct ConfigurationParser {
    
    private var configuration: [String:Any]
    
    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.configuration = [:]
            return
        }
        self.configuration = configuration
    }
    
    public var environment: Environment {
        guard let environmentString = configuration[Keys.environment] as? String else { return .test
        }
        
        return Environment.parse(environmentString)
    }
    
    public var clientKey: String? {
        return configuration[Keys.clientKey] as? String
    }
    
    public var amount: Amount? {
        guard let paymentObject = configuration[Keys.amount] as? [String: Any],
              let paymentAmount = paymentObject[Keys.value] as? Int,
              let currencyCode = paymentObject[Keys.currency] as? String
        else {
            return nil
        }
        
        return Amount(value: paymentAmount, currencyCode: currencyCode)
    }
    
    public var payment: Payment? {
        guard let amount = self.amount,
              let countryCode = configuration[Keys.countryCode] as? String
        else {
            return nil
        }
        
        return Payment(amount: amount, countryCode: countryCode)
    }
    
    public var shopperLocale: Locale? {
        guard let shopperLocaleString = configuration[Keys.shopperLocale] as? String else {
            return nil
        }
        
        return Locale(identifier: shopperLocaleString)
    }
    
}

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

public struct DropInConfigurationParser {
    
    private var dict: [String:Any]
    
    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configuration = configuration[DropInKeys.rootKey] as? [String: Any] {
            self.dict = configuration
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

public struct ApplepayConfigurationParser {
 
    private var dict: [String:Any]
    
    public init(configuration: NSDictionary) {
        guard let configuration = configuration as? [String: Any] else {
            self.dict = [:]
            return
        }
        if let configuration = configuration[ApplePayKeys.rootKey] as? [String: Any] {
            self.dict = configuration
        } else {
            self.dict = configuration
        }
    }
    
    var merchantID: String? {
        return dict[ApplePayKeys.merchantID] as? String
    }
    
    var merchantName: String? {
        return dict[ApplePayKeys.merchantName] as? String
    }
    
    public func tryConfiguration(amount: Amount) -> ApplePayComponent.Configuration? {
        guard let merchantName = merchantName, let merchantID = merchantID else {
            return nil
        }
        
        let amount = AmountFormatter.decimalAmount(amount.value,
                                                   currencyCode: amount.currencyCode,
                                                   localeIdentifier: amount.localeIdentifier)
        return .init(summaryItems: [PKPaymentSummaryItem(label: merchantName, amount: amount)],
                     merchantIdentifier: merchantID,
                     allowOnboarding: false)
//                     requiredBillingContactFields: Set<PKContactField>,
//                     requiredShippingContactFields: Set<PKContactField>,
//                     billingContact: PKContact?,
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
