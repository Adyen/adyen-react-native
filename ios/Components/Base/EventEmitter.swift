//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import Foundation

/// Protocol for emitting events to React Native.
/// Allows for dependency injection and testability.
internal protocol EventEmitter: AnyObject {
    func send(event: Events, body: Any?)
}
