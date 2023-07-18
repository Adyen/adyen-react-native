//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import Adyen

/// Describes class that provides customization to Adyen UI elements.
public protocol AdyenAppearanceProvider: AnyObject {
    
    /// Implement this method to apply the style to the Drop-In and all components.
    /// Uses Drop-In Component Style as an umbrella style.
    static func createStyle() -> DropInComponent.Style
    
}

internal class AdyenAppearanceLoader: NSObject {
    
    private static let expectedClassName = "AdyenAppearance"
    
    static func findStyle() -> Adyen.DropInComponent.Style? {
        let bundleName = Bundle.main.infoDictionary?["CFBundleName"] as? String ?? ""
        guard let nsClass = NSClassFromString("\(bundleName).\(expectedClassName)"),
              let appearanceProvider = nsClass as? AdyenAppearanceProvider.Type else {
            adyenPrint("AdyenAppearance: class \("\(bundleName).\(expectedClassName)") not found or does not conform to AdyenAppearanceProvider protocol")
            return nil
        }
        return appearanceProvider.createStyle()
    }
}


