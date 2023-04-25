//
// Copyright (c) 2023 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import Adyen
import adyen_react_native

class AdyenAppearance: AdyenAppearanceProvider {
  static func createStyle() -> Adyen.DropInComponent.Style {
    return .init(tintColor: .systemTeal)
  }
}
