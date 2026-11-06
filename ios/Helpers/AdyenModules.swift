//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

// Adyen iOS is a Swift package with one module per product under both CocoaPods (through
// `spm_dependency`) and Swift Package Manager. Re-exporting the product modules lets the sources
// keep a plain `import Adyen`. `@_exported` makes these imports visible to every file of this
// module and to every module that imports it, so apps can reach e.g. `RedirectComponent` or
// `DropInComponent` through `import adyen_react_native`.
@_exported import AdyenActions
@_exported import AdyenCard
@_exported import AdyenComponents
@_exported import AdyenDropIn
@_exported import AdyenEncryption
@_exported import AdyenSession
@_exported import Foundation
