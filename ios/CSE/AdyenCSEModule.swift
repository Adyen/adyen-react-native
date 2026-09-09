//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React

@objc(AdyenCSE)
internal final class AdyenCSEModule: NSObject {

    @objc
    static func requiresMainQueueSetup() -> Bool {
        true
    }

    @objc
    func encryptCard(_ payload: NSDictionary,
                     publicKey: NSString,
                     resolver: RCTPromiseResolveBlock,
                     rejecter: RCTPromiseRejectBlock) {
        do {
            let unencryptedCard = try Card(from: payload)
            let encryptedCard = try CardEncryptor.encrypt(card: unencryptedCard, with: publicKey as String)
            resolver(encryptedCard.jsonObject)
        } catch {
            rejecter(Constant.errorMessage, nil, error)
        }
    }

    @objc
    func encryptBin(_ bin: NSString,
                    publicKey: NSString,
                    resolver: RCTPromiseResolveBlock,
                    rejecter: RCTPromiseRejectBlock) {
        let formattedBin = bin.replacingOccurrences(of: " ", with: "")
        do {
            let encryptedBin = try CardEncryptor.encrypt(bin: formattedBin as String, with: publicKey as String)
            resolver(encryptedBin)
        } catch {
            rejecter("AdyenCSE", Constant.errorMessage, error)
        }
    }

    @objc
    func validateCardNumber(_ cardNumber: NSString,
                            enableLuhnCheck: Bool,
                            resolver: RCTPromiseResolveBlock,
                            rejecter _: RCTPromiseRejectBlock) {
        let isValid = CardNumberValidator(
            isLuhnCheckEnabled: enableLuhnCheck,
            isEnteredBrandSupported: true
        ).isValid(cardNumber as String)
        resolver(isValid)
    }

    @objc
    func validateCardExpiryDate(_ expiryMonth: NSString,
                                expiryYear: NSString,
                                resolver: RCTPromiseResolveBlock,
                                rejecter _: RCTPromiseRejectBlock) {
        let yearString = expiryYear as String
        let isValid: Bool
        if yearString.count == 2 || yearString.count == 4 {
            let lastTwoYearChars = String(yearString.suffix(2))
            isValid = CardExpiryDateValidator().isValid("\(expiryMonth)\(lastTwoYearChars)")
        } else {
            isValid = false
        }
        resolver(isValid)
    }

    @objc
    func validateCardSecurityCode(_ securityCode: NSString,
                                  cardBrand: NSString?,
                                  resolver: RCTPromiseResolveBlock,
                                  rejecter _: RCTPromiseRejectBlock) {
        if let cardBrand = cardBrand as String? {
            let brand = CardBrand(rawValue: cardBrand)
            resolver(CardSecurityCodeValidator(cardBrand: brand).isValid(securityCode as String))
        } else {
            resolver(CardSecurityCodeValidator().isValid(securityCode as String))
        }
    }

    private enum Constant {
        static var errorMessage = "Encryption failed"
    }
}
