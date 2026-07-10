//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

internal func ensureMainThread(_ work: @escaping @MainActor () -> Void) {
    if Thread.isMainThread {
        MainActor.assumeIsolated {
            work()
        }
    } else {
        DispatchQueue.main.async { @MainActor in
            work()
        }
    }
}
