//
// Copyright (c) 2022 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//


import UIKit
import React

internal class BaseModule: RCTEventEmitter {

    open override func supportedEvents() -> [String]! { Events.allCases.map { $0.rawValue }  }
    
    internal func sendEvent(event: Events, body: Any!) {
        self.sendEvent(withName: event.rawValue, body: body)
    }
    
}
