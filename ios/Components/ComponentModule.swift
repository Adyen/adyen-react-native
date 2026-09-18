//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

/// Registry of the payment components built for mounted `<AdyenComponent>` views, so `cleanup()` can dispose them all.
/// Emits nothing to JS; events travel through ``ContextModule`` instead.
@objc(AdyenComponent)
internal final class ComponentModule: BaseModule {

    static var shared: ComponentModule?

    /// Per-viewId component controllers. Main-thread-only; the views register from the main thread.
    private var delegates: [String: ComponentProxy] = [:]

    override func supportedEvents() -> [String]! {
        []
    }

    override init() {
        super.init()
        MainActor.assumeIsolated {
            Self.shared = self
        }
    }

    // MARK: - Registration

    func register(viewId: String) -> ComponentProxy {
        let proxy = ComponentProxy(viewId: viewId, emitter: ContextModule.shared)
        delegates[viewId] = proxy
        return proxy
    }

    func unregister(viewId: String) {
        delegates.removeValue(forKey: viewId)?.dispose()
    }

    override func cleanUp() {
        ensureMainThread { [weak self] in
            self?.cleanUpOnMainThread()
        }
    }

    private func cleanUpOnMainThread() {
        delegates.values.forEach { $0.dispose() }
        delegates.removeAll()
        super.cleanUp()
    }
}
