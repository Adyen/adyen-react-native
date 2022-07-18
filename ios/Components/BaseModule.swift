//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React
import UIKit

internal class BaseModule: RCTEventEmitter {

    override open func supportedEvents() -> [String]! { Events.allCases.map(\.rawValue) }
    
    internal func sendEvent(event: Events, body: Any!) {
        self.sendEvent(withName: event.rawValue, body: body)
    }
    
}
