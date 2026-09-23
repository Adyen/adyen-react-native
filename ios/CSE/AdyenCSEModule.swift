//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import AdyenCard
import AdyenEncryption
import Foundation
import React

/// Swift implementation backing the generated CSE TurboModule.
@objc(CSETurboModuleAdapter)
internal final class CSETurboModuleAdapter: NSObject {

    @objc
    func encryptCard(_ payload: NSDictionary,
                     publicKey: NSString,
                     resolver: RCTPromiseResolveBlock,
                     rejecter: RCTPromiseRejectBlock) {
        do {
            let unencryptedCard = try Card(from: payload)
            let encryptedCard = try CardEncryptor.encrypt(card: unencryptedCard, with: publicKey as String)
            try resolver(jsonString(encryptedCard.jsonObject))
        } catch {
            rejecter(Constant.errorMessage, nil, error)
        }
    }

    @objc
    func encryptBin(_ bin: NSString,
                    publicKey: NSString,
                    resolver: RCTPromiseResolveBlock,
                    rejecter: RCTPromiseRejectBlock) {
        do {
            try resolver(CardEncryptor.encrypt(bin: bin.replacingOccurrences(of: " ", with: "") as String,
                                               with: publicKey as String))
        } catch {
            rejecter(Constant.errorMessage, nil, error)
        }
    }

    @objc
    func validateCardNumber(_ cardNumber: NSString,
                            enableLuhnCheck: Bool,
                            resolver: RCTPromiseResolveBlock) {
        resolver(CardNumberValidator(isLuhnCheckEnabled: enableLuhnCheck, isEnteredBrandSupported: true)
            .isValid(cardNumber as String))
    }

    @objc
    func validateCardExpiryMonth(_ expiryMonth: NSString,
                                 year expiryYear: NSString,
                                 resolver: RCTPromiseResolveBlock) {
        let yearString = expiryYear as String
        let isValid = if yearString.count == 2 || yearString.count == 4 {
            CardExpiryDateValidator().isValid("\(expiryMonth)\(yearString.suffix(2))")
        } else {
            false
        }
        resolver(isValid)
    }

    @objc
    func validateCardSecurityCode(_ securityCode: NSString,
                                  brand cardBrand: NSString?,
                                  resolver: RCTPromiseResolveBlock) {
        if let cardBrand {
            resolver(CardSecurityCodeValidator(cardBrand: CardBrand(rawValue: cardBrand as String))
                .isValid(securityCode as String))
        } else {
            resolver(CardSecurityCodeValidator().isValid(securityCode as String))
        }
    }

    private enum Constant {
        static let errorMessage = "Encryption failed"
    }
}

private func jsonString(_ object: Any) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: object)
    return String(decoding: data, as: UTF8.self)
}
