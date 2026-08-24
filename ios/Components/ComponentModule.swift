//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Adyen
import React

/// Registry of the payment components built for mounted `<AdyenComponent>` views.
///
/// Exists only so teardown can reach them. `cleanup()` has to dispose every mounted view's
/// component, and JS cannot do that because the merchant owns the JSX and can keep a view mounted
/// across a checkout being replaced.
///
/// It exposes nothing to JS and emits nothing: the merchant's callbacks are global rather than per
/// view, so events and results all travel through ``ContextModule``. Registration is native-only,
/// driven by the view itself.
@objc(AdyenComponent)
internal final class ComponentModule: BaseModule {

    static var shared: ComponentModule?

    /// Per-viewId component controllers. Main-thread-only; the views register from the main thread.
    private var delegates: [String: ComponentProxy] = [:]

    override func supportedEvents() -> [String]! {
        // Emits nothing. Every event reaches JS through ContextModule, the module the JS side
        // subscribes to.
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
