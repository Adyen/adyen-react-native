//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

// The Adyen CocoaPod compiles all of its subspecs into the single `Adyen` module, while the
// Swift package splits them into one module per product. Re-exporting the product modules lets
// the sources keep a plain `import Adyen` under both integrations. `@_exported` makes these
// imports visible to every file of this module and to every module that imports it, so apps can
// reach e.g. `RedirectComponent` or `DropInComponent` through `import adyen_react_native`.
@_exported import Foundation

// `SWIFT_PACKAGE` rather than `canImport`: SwiftPM-built Adyen modules left in a shared build
// directory would otherwise be picked up by a CocoaPods build.
#if SWIFT_PACKAGE
    @_exported import AdyenActions
    @_exported import AdyenCard
    @_exported import AdyenComponents
    @_exported import AdyenDropIn
    @_exported import AdyenEncryption
    @_exported import AdyenSession
#endif
