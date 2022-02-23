//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

@objc
public class RedirectComponentProxy: NSObject {

    @objc
    public class func proccessURL(_ url: NSURL) -> Bool {
        RedirectComponent.applicationDidOpen(from: url as URL)
    }

}
