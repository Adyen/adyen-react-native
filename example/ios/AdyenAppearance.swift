//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import adyen_react_native
import Foundation

/// Please make sure that the name of the class exactly matches.
/// SDK will use reflection to find the class with this exact name.
class AdyenAppearance: AdyenAppearanceProvider {
    static func createStyle() -> Adyen.DropInComponent.Style {
        .init(tintColor: .systemTeal)
    }
}
