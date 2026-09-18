//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
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
        #if canImport(AdyenActions)
            // Modular build: `AdyenActions` is separate, so use the public `Checkout.handleReturn(url:)`.
            return Checkout.handleReturn(url: url)
        #else
            // Umbrella CocoaPods build: everything merges into `Adyen`, so call the underlying API directly.
            // TODO: Check if this is still needed.
            return RedirectComponent.applicationDidOpen(from: url)
        #endif
    }

}
