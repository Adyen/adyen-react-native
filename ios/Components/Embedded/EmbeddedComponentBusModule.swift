//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

@objc(AdyenComponentBus)
internal final class EmbeddedComponentBusModule: BaseAddressModule {

    static var shared: EmbeddedComponentBusModule?

    /// Per-componentType delegate proxies
    private var delegates: [String: EmbeddedComponentDelegateProxy] = [:]

    /// Shared action handler for all embedded views
    private var actionHandler: AdyenActionComponent?

    /// ComponentTypes with active JS subscriptions
    private var subscribedTypes: Set<String> = []

    /// Per-componentType address lookup handlers
    private var lookupHandlers: [String: ([LookupAddressModel]) -> Void] = [:]
    private var lookupCompletionHandlers: [String: (Result<PostalAddress, Error>) -> Void] = [:]

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + EventName.cardEvents.map(\.rawValue)
    }

    override init() {
        super.init()
        Self.shared = self
    }

    // MARK: - Registration

    func register(componentType: String) -> EmbeddedComponentDelegateProxy {
        let proxy = EmbeddedComponentDelegateProxy(componentType: componentType, bus: self)
        delegates[componentType] = proxy
        return proxy
    }

    func unregister(componentType: String) {
        delegates.removeValue(forKey: componentType)
        lookupHandlers.removeValue(forKey: componentType)
        lookupCompletionHandlers.removeValue(forKey: componentType)
        if delegates.isEmpty {
            actionHandler?.cancelIfNeeded()
            actionHandler = nil
        }
    }

    // MARK: - Lookup handler storage (called by EmbeddedComponentDelegateProxy)

    func storeLookupHandler(for componentType: String, handler: @escaping ([LookupAddressModel]) -> Void) {
        lookupHandlers[componentType] = handler
    }

    func storeLookupCompletionHandler(for componentType: String, handler: @escaping (Result<PostalAddress, Error>) -> Void) {
        lookupCompletionHandlers[componentType] = handler
    }

    // MARK: - Shared action handler

    override func createActionHandlerIfNeeded(context: AdyenContext, locale: String?) {
        guard BaseModule.session == nil, actionHandler == nil else { return }

        let style = AdyenAppearanceLoader.findStyle()?.actionComponent ?? .init()
        var config = AdyenActionComponent.Configuration(style: style)
        if let locale {
            config.localizationParameters = LocalizationParameters(enforcedLocale: locale)
        }
        let handler = AdyenActionComponent(context: context, configuration: config)
        handler.presentationDelegate = self
        actionHandler = handler
    }

    // MARK: - JS subscription lifecycle

    @objc
    func subscribe(_ componentType: String) {
        subscribedTypes.insert(componentType)
    }

    @objc
    func unsubscribe(_ componentType: String) {
        subscribedTypes.remove(componentType)
        unregister(componentType: componentType)
        if subscribedTypes.isEmpty {
            cleanUp()
        }
    }

    // MARK: - ComponentType-routed commands (called from JS)

    @objc
    func handle(_ componentType: String, action actionDict: NSDictionary?) {
        guard let actionDict else { return }
        guard let handler = actionHandler else {
            sendError(error: ModuleException.componentNotRegistered(componentType))
            return
        }
        guard let proxy = delegates[componentType] else {
            sendError(error: ModuleException.componentNotRegistered(componentType))
            return
        }
        do {
            let action = try parseAction(from: actionDict)
            DispatchQueue.main.async {
                handler.delegate = proxy
                handler.handle(action)
            }
        } catch {
            sendError(error: error)
        }
    }

    @objc
    func update(_ componentType: String, results: NSArray?) {
        guard let lookupHandler = lookupHandlers[componentType] else { return }
        let addressModels: [LookupAddressModel] = (results ?? [])
            .compactMap { $0 as? NSDictionary }
            .compactMap { try? $0.decode() }
        DispatchQueue.main.async {
            lookupHandler(addressModels)
        }
    }

    @objc
    func confirm(_ componentType: String, success: NSNumber, address: NSDictionary) {
        guard let lookupCompletionHandler = lookupCompletionHandlers[componentType] else { return }
        DispatchQueue.main.async {
            if !success.boolValue, let message = address[Keys.message] as? String {
                return lookupCompletionHandler(.failure(AddressError(message: message)))
            }
            do {
                let addressModel: LookupAddressModel = try address.decode()
                lookupCompletionHandler(.success(addressModel.postalAddress))
            } catch {
                lookupCompletionHandler(.failure(error))
            }
        }
    }

    @objc
    func hide(_ componentType: String, success: NSNumber, event _: NSDictionary) {
        unregister(componentType: componentType)
        if delegates.isEmpty {
            dismiss(success.boolValue)
        }
    }

    override func cleanUp() {
        delegates.removeAll()
        subscribedTypes.removeAll()
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        lookupHandlers.removeAll()
        lookupCompletionHandlers.removeAll()
        super.cleanUp()
    }
}
