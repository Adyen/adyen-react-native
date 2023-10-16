//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

/// Describes class that provides customization to Adyen UI elements.
public protocol AdyenAppearanceProvider: AnyObject {
    
    /// Implement this method to apply the style to the Drop-In and all components.
    /// Uses Drop-In Component Style as an umbrella style.
    static func createStyle() -> DropInComponent.Style
    
}

internal class AdyenAppearanceLoader: NSObject {
    
    private static let expectedClassName = "AdyenAppearance"
    private static let bundleExecutableKey = "CFBundleExecutable"
    
    static func findStyle() -> Adyen.DropInComponent.Style? {
        let appearanceProviders = Bundle.allBundles
            .compactMap { $0.infoDictionary?[bundleExecutableKey] as? String }
            .map { $0.replacingOccurrences(of: " ", with: "_") }
            .compactMap { NSClassFromString("\($0).\(expectedClassName)") }
            .compactMap { $0 as? AdyenAppearanceProvider.Type }
        
        guard let appearanceProvider = appearanceProviders.first else {
            adyenPrint("AdyenAppearance: class not linked or does not conform to AdyenAppearanceProvider protocol")
            return nil
        }
        return appearanceProvider.createStyle()
    }
}
