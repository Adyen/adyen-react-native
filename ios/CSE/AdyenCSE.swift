//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation
import React

@objc(AdyenCSE)
final internal class AdyenCSE: BaseModule {

    @objc
    override static func requiresMainQueueSetup() -> Bool { true }
    override func stopObserving() {}
    override func startObserving() {}

    @objc
    func encryptCard(_ card: NSDictionary, publicKey: NSString) {
    }

    @objc
    func encryptBin(_ bin: NSString, publicKey: NSString) {
    }
}