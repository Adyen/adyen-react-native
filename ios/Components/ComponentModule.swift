//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

@objc(AdyenComponent)
internal final class ComponentModule: BaseAddressModule {

    static var shared: ComponentModule?

    // Main-thread-only mutable state. Access these properties via the `*OnMainThread` helpers
    // or through JS entry points that dispatch with `ensureMainThread(_:)`.

    /// Per-viewId component controllers. Each owns its own v6 checkout flow and payment component.
    private var delegates: [String: ComponentProxy] = [:]

    /// ViewIds with active JS subscriptions
    private var subscribedViews: Set<String> = []

    /// Per-viewId address lookup handlers
    private var lookupHandlers: [String: ([AddressLookupResult]) -> Void] = [:]
    private var lookupCompletionHandlers: [String: (Result<PostalAddress, Error>) -> Void] = [:]

    override func supportedEvents() -> [String]! {
        super.supportedEvents() + EventName.cardEvents.map(\.rawValue)
    }

    override init() {
        super.init()
        MainActor.assumeIsolated {
            Self.shared = self
        }
    }

    // MARK: - Registration

    func register(viewId: String) -> ComponentProxy {
        let proxy = ComponentProxy(viewId: viewId, bus: self)
        delegates[viewId] = proxy
        return proxy
    }

    func unregister(viewId: String) {
        delegates.removeValue(forKey: viewId)?.dispose()
        lookupHandlers.removeValue(forKey: viewId)
        lookupCompletionHandlers.removeValue(forKey: viewId)
    }

    // MARK: - Lookup handler storage (called by ComponentProxy)

    func storeLookupHandler(for viewId: String, handler: @escaping ([AddressLookupResult]) -> Void) {
        lookupHandlers[viewId] = handler
    }

    func storeLookupCompletionHandler(for viewId: String, handler: @escaping (Result<PostalAddress, Error>) -> Void) {
        lookupCompletionHandlers[viewId] = handler
    }

    // MARK: - JS subscription lifecycle

    @objc
    func subscribe(_ viewId: String) {
        ensureMainThread { [weak self] in
            self?.subscribeOnMainThread(viewId)
        }
    }

    @objc
    func unsubscribe(_ viewId: String) {
        ensureMainThread { [weak self] in
            self?.unsubscribeOnMainThread(viewId)
        }
    }

    // MARK: - ViewId-routed commands (called from JS)

    @objc
    func action(_ viewId: String, actionDict: NSDictionary?) {
        ensureMainThread { [weak self] in
            self?.actionOnMainThread(viewId, actionDict: actionDict)
        }
    }

    @objc
    func update(_ viewId: String, results: NSArray?) {
        ensureMainThread { [weak self] in
            self?.updateOnMainThread(viewId, results: results)
        }
    }

    @objc
    func confirm(_ viewId: String, success: NSNumber, address: NSDictionary?) {
        ensureMainThread { [weak self] in
            self?.confirmOnMainThread(viewId, success: success, address: address)
        }
    }

    @objc
    func completion(_ viewId: String, resultCode: NSString) {
        ensureMainThread { [weak self] in
            self?.completionOnMainThread(viewId, resultCode: resultCode)
        }
    }

    @objc
    func retry(_ viewId: String, message: NSString?) {
        ensureMainThread { [weak self] in
            self?.retryOnMainThread(viewId, message: message)
        }
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.cleanUpOnMainThread()
        }
    }

    private func subscribeOnMainThread(_ viewId: String) {
        subscribedViews.insert(viewId)
    }

    private func unsubscribeOnMainThread(_ viewId: String) {
        subscribedViews.remove(viewId)
        unregister(viewId: viewId)
        if subscribedViews.isEmpty {
            cleanUpOnMainThread()
        }
    }

    private func actionOnMainThread(_ viewId: String, actionDict: NSDictionary?) {
        guard let actionDict else { return }
        guard let proxy = delegates[viewId] else {
            sendError(error: ModuleException.componentNotRegistered(viewId))
            return
        }
        do {
            let action = try parseAction(from: actionDict)
            proxy.handle(action: action)
        } catch {
            sendError(error: error)
        }
    }

    private func updateOnMainThread(_ viewId: String, results: NSArray?) {
        guard let lookupHandler = lookupHandlers[viewId] else { return }

        let addressResults: [AddressLookupResult] = (results ?? [])
            .compactMap { $0 as? NSDictionary }
            .compactMap { try? $0.decode() }
        lookupHandler(addressResults)
    }

    private func confirmOnMainThread(_ viewId: String, success: NSNumber, address: NSDictionary?) {
        guard let lookupCompletionHandler = lookupCompletionHandlers[viewId] else { return }

        if !success.boolValue {
            let message = (address?[Keys.message] as? String) ?? Keys.defaultRejectionMessage
            return lookupCompletionHandler(.failure(AddressError(message: message)))
        }

        guard let address else {
            return lookupCompletionHandler(.failure(AddressError(message: Keys.missingAddressMessage)))
        }

        do {
            let addressResult: AddressLookupResult = try address.decode()
            lookupCompletionHandler(.success(addressResult.postalAddress))
        } catch {
            lookupCompletionHandler(.failure(error))
        }
    }

    private func completionOnMainThread(_ viewId: String, resultCode: NSString) {
        let code = resultCode as String
        delegates[viewId]?.resolveCompletion(resultCode: code)
        unregister(viewId: viewId)
        if delegates.isEmpty {
            dismiss(true)
        }
    }

    private func retryOnMainThread(_ viewId: String, message: NSString?) {
        let msg = message as String?
        delegates[viewId]?.resolveRetry(message: (msg?.isEmpty ?? true) ? nil : msg)
        unregister(viewId: viewId)
        if delegates.isEmpty {
            dismiss(false)
        }
    }

    private func cleanUpOnMainThread() {
        delegates.values.forEach { $0.dispose() }
        delegates.removeAll()
        subscribedViews.removeAll()
        lookupHandlers.removeAll()
        lookupCompletionHandlers.removeAll()
        super.cleanUp()
    }

    private enum Keys {
        static let message = "message"
        static let defaultRejectionMessage = "Address lookup was rejected."
        static let missingAddressMessage = "Address lookup confirmation is missing address data."
    }
}
