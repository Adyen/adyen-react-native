//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

@objc(AdyenComponentBus)
internal final class AdyenComponentBusModule: BaseAddressLookup {

    static var shared: AdyenComponentBusModule?
    internal static var staticActionHandler: AdyenActionComponent?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + Events.cardEvents.map(\.rawValue)
    }

    override init() {
        super.init()
        Self.shared = self
    }
}
