//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseActionModule: BaseModuleSender {

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + [EventName.additionalDetails, EventName.complete].map(\.rawValue)
    }

    @objc
    func action(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendError(error: error)
        }

        ensureMainThread { [weak self] in
            self?.checkout?.handle(action: action)
        }
    }
}
