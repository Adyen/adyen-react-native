//
// Copyright (c) 2025 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen

internal class BaseActionHandler: BaseModuleSender {

    private var actionHandler: AdyenActionComponent?

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + [Events.additionalDetails, Events.complete].map(\.rawValue)
    }

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

    internal func createActionHandlerIfNeede(context: AdyenContext, locale: String?) {
        guard BaseModule.session == nil else { return }
        
        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        var config = AdyenActionComponent.Configuration(style: style)
        if let locale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }
        actionHandler = AdyenActionComponent(context: context, configuration: config)
        actionHandler?.delegate = self
        actionHandler?.presentationDelegate = self
    }
}
