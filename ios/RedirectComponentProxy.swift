//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
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
            // Modular build (SPM / dynamic frameworks): `AdyenActions` is a separate module and
            // `Checkout.handleReturn(url:)` is the public redirect-return entry point.
            return Checkout.handleReturn(url: url)
        #else
            // Umbrella CocoaPods build: every Adyen module merges into a single `Adyen` module, so
            // `canImport(AdyenActions)` is false and `Checkout.handleReturn` is not compiled.
            // Call the same underlying API it wraps; it is reachable because the bridge is
            // compiled into the `com.adyen.checkout` package (see the podspec Swift flags).
            return RedirectComponent.applicationDidOpen(from: url)
        #endif
    }

}
