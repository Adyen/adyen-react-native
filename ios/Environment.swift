//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation
import Adyen


extension Environment {

  internal static func parse(_ value: String) -> Environment {
    switch value.lowercased() {
    case "beta": return .beta
    case "live", "liveeurope": return .liveEurope
    case "liveaustralia": return .liveAustralia
    case "liveunitedstates": return .liveUnitedStates
    default:
      return .test
    }
  }

}
