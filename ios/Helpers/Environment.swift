//
// Copyright (c) 2021 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Foundation

extension Environment {

    internal static func parse(_ value: String) -> Environment {
        switch value.lowercased() {
        case "live-au": return .liveAustralia
        case "live", "live-eu": return .liveEurope
        case "live-us": return .liveUnitedStates
        case "live-apse": .liveApse
        case "live-in": .liveIndia
        default:
            return .test
        }
    }

}
