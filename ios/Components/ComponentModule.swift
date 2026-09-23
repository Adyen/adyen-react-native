//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React

/// Legacy event-emitter shell retained only for binary compatibility. Fabric presenters register
/// directly with ``CheckoutCoordinator``; this module owns no view or checkout state.
@objc(AdyenComponent)
internal final class ComponentModule: BaseModule {

    override func supportedEvents() -> [String]! {
        []
    }
}
