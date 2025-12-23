//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import Adyen3DS2

extension Error {

    var isComponentCanceled: Bool { (self as? ComponentError) == ComponentError.cancelled }

    var is3DSCanceled: Bool {
        (self as NSError).domain == "com.adyen.Adyen3DS2.ADYRuntimeError" &&
            (self as NSError).code == ADYRuntimeErrorCode.challengeCancelled.rawValue
    }
}
