//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import AdyenCheckout
#if canImport(AdyenActions)
    import AdyenCheckout
#endif
import Foundation

@objc
public class RedirectComponentProxy: NSObject {

    @objc @MainActor
    public class func proccessURL(_ url: NSURL) -> Bool {
        proccessURL(url as URL)
    }

    @MainActor
    public class func proccessURL(_ url: URL) -> Bool {
        Checkout.handleReturn(url: url)
    }

}
