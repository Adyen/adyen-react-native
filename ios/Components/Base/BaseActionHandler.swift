//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseActionHandler: BaseModuleSender {

    internal var actionHandler: AdyenActionComponent?

    @objc
    func handle(_ dictionary: NSDictionary) {
        let action: Action
        do {
            action = try parseAction(from: dictionary)
        } catch {
            return sendError(error: error)
        }

        DispatchQueue.main.async { [weak self] in
            self?.actionHandler?.handle(action)
        }
    }

    @objc
    override func hide(_ success: NSNumber, event: NSDictionary) {
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        super.hide(success, event: event)
    }
}
