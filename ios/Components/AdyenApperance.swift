//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

@_spi(AdyenInternal) import Adyen
import Foundation

/// Describes class that provides customization to Adyen UI elements.
public protocol AdyenAppearanceProvider: AnyObject {

    /// Implement this method to apply a checkout-wide theme to the Drop-In and all components.
    static func createStyle() -> CheckoutTheme

}

internal class AdyenAppearanceLoader: NSObject {

    private static let expectedClassName = "AdyenAppearance"
    private static let bundleExecutableKey = "CFBundleExecutable"

    static func findStyle() -> CheckoutTheme? {
        let appearanceProviders = Bundle.allBundles
            .compactMap { $0.infoDictionary?[bundleExecutableKey] as? String }
            .map { $0.replacingOccurrences(of: " ", with: "_") }
            .map { $0.replacingOccurrences(of: "-", with: "_") }
            .compactMap { NSClassFromString("\($0).\(expectedClassName)") }
            .compactMap { $0 as? AdyenAppearanceProvider.Type }

        guard let appearanceProvider = appearanceProviders.first else {
            #if DEBUG
                print("AdyenAppearance: class not linked or does not conform to AdyenAppearanceProvider protocol")
            #endif
            return nil
        }
        return appearanceProvider.createStyle()
    }
}
