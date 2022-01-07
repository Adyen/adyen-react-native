//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import Adyen


@objc
public class RedirectComponentProxy: NSObject {

    @objc
    class public func proccessURL(_ url: NSURL) -> Bool {
        return RedirectComponent.applicationDidOpen(from: url as URL)
    }

}
