//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

/// Bridge module coordinating embedded payment components (e.g. card) between JS and the native SDK.
///
/// All mutable state is main-thread-only; access is routed through `ensureMainThread(_:)`.
@objc(AdyenComponentBus)
internal final class EmbeddedComponentBusModule: BaseAddressModule {

    static var shared: EmbeddedComponentBusModule?

    /// Per-viewId delegate proxies
    private var delegates: [String: EmbeddedComponentDelegateProxy] = [:]

    /// Shared action handler for all embedded views
    private var actionHandler: AdyenActionComponent?

    /// ViewIds with active JS subscriptions
    private var subscribedViews: Set<String> = []

    /// Per-viewId address lookup handlers
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

    func register(viewId: String) -> EmbeddedComponentDelegateProxy {
        let proxy = EmbeddedComponentDelegateProxy(viewId: viewId, bus: self)
        delegates[viewId] = proxy
        return proxy
    }

    func unregister(viewId: String) {
        delegates.removeValue(forKey: viewId)
        lookupHandlers.removeValue(forKey: viewId)
        lookupCompletionHandlers.removeValue(forKey: viewId)
        if delegates.isEmpty {
            actionHandler?.cancelIfNeeded()
            actionHandler = nil
        }
    }

    // MARK: - Lookup handler storage (called by EmbeddedComponentDelegateProxy)

    func storeLookupHandler(for viewId: String, handler: @escaping ([LookupAddressModel]) -> Void) {
        lookupHandlers[viewId] = handler
    }

    func storeLookupCompletionHandler(for viewId: String, handler: @escaping (Result<PostalAddress, Error>) -> Void) {
        lookupCompletionHandlers[viewId] = handler
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
    func subscribe(_ viewId: String) {
        ensureMainThread { [weak self] in
            self?.performSubscribe(viewId)
        }
    }

    @objc
    func unsubscribe(_ viewId: String) {
        ensureMainThread { [weak self] in
            self?.performUnsubscribe(viewId)
        }
    }

    // MARK: - ViewId-routed commands (called from JS)

    @objc
    func handle(_ viewId: String, action actionDict: NSDictionary?) {
        ensureMainThread { [weak self] in
            self?.performHandle(viewId, action: actionDict)
        }
    }

    @objc
    func update(_ viewId: String, results: NSArray?) {
        ensureMainThread { [weak self] in
            self?.performUpdate(viewId, results: results)
        }
    }

    @objc
    func confirm(_ viewId: String, success: NSNumber, address: NSDictionary) {
        ensureMainThread { [weak self] in
            self?.performConfirm(viewId, success: success, address: address)
        }
    }

    @objc
    func hide(_ viewId: String, success: NSNumber, event _: NSDictionary) {
        ensureMainThread { [weak self] in
            self?.performHide(viewId, success: success)
        }
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.performCleanUp()
        }
    }

    private func performSubscribe(_ viewId: String) {
        subscribedViews.insert(viewId)
    }

    private func performUnsubscribe(_ viewId: String) {
        subscribedViews.remove(viewId)
        unregister(viewId: viewId)
        if subscribedViews.isEmpty {
            performCleanUp()
        }
    }

    private func performHandle(_ viewId: String, action actionDict: NSDictionary?) {
        guard let actionDict else { return }
        guard let handler = actionHandler else {
            sendError(error: ModuleException.componentNotRegistered(viewId))
            return
        }
        guard let proxy = delegates[viewId] else {
            sendError(error: ModuleException.componentNotRegistered(viewId))
            return
        }
        do {
            let action = try parseAction(from: actionDict)
            handler.delegate = proxy
            handler.handle(action)
        } catch {
            sendError(error: error)
        }
    }

    private func performUpdate(_ viewId: String, results: NSArray?) {
        guard let lookupHandler = lookupHandlers[viewId] else { return }

        let addressModels: [LookupAddressModel] = (results ?? [])
            .compactMap { $0 as? NSDictionary }
            .compactMap { try? $0.decode() }
        lookupHandler(addressModels)
    }

    private func performConfirm(_ viewId: String, success: NSNumber, address: NSDictionary) {
        guard let lookupCompletionHandler = lookupCompletionHandlers[viewId] else { return }

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

    private func performHide(_ viewId: String, success: NSNumber) {
        unregister(viewId: viewId)
        if delegates.isEmpty {
            dismiss(success.boolValue)
        }
    }

    private func performCleanUp() {
        delegates.removeAll()
        subscribedViews.removeAll()
        actionHandler?.cancelIfNeeded()
        actionHandler = nil
        lookupHandlers.removeAll()
        lookupCompletionHandlers.removeAll()
        super.cleanUp()
    }
}
