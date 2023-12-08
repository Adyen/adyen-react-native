//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React

@objc(AdyenCSE)
internal final class AdyenCSE: NSObject {

    @objc
    static func requiresMainQueueSetup() -> Bool { true }

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
            rejecter(Constant.errorMessage, nil, error)
        }
    }

    private enum Constant {
        static var errorMessage = "Encryption failed"
    }
}
