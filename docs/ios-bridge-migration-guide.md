# iOS Bridge Migration Guide: Adyen iOS SDK v5 to v6.0.0-alpha.1

## Overview

The iOS bridge layer of `adyen-react-native` was rewritten to use Adyen iOS SDK 6.0.0-alpha.1. All delegate-based patterns (conforming to `PaymentComponentDelegate`, `ActionComponentDelegate`, `AdyenSessionDelegate`, etc.) have been replaced with `Checkout.setup()` entry points and closure-based callbacks. Swift concurrency is used throughout: `@MainActor` isolation, `async/await` for checkout setup, and `CheckedContinuation` to bridge the asynchronous closures back to the React Native event model.

---

## Deployment Target

| | v5 | v6 |
|---|---|---|
| **Minimum iOS** | 12.0 | 16.0 |

The podspec now declares:

```ruby
s.platform = :ios, "16.0"
```

iOS 16.0 is required by the Adyen iOS SDK v6.

---

## Dependency Changes

| | v5 | v6 |
|---|---|---|
| **Adyen pod version** | `5.24.0` | `6.0.0-alpha.1` |

A new `pod_target_xcconfig` entry was added to the podspec:

```ruby
s.pod_target_xcconfig = {
  'OTHER_SWIFT_FLAGS' => '$(inherited) -package-name com.adyen.checkout'
}
```

This compiles the bridge into the Adyen SDK's Swift package namespace, granting access to `package`-scoped APIs (specifically `RedirectComponent.applicationDidOpen(from:)`) that are needed in the CocoaPods umbrella build where `canImport(AdyenActions)` is `false`.

---

## React Native Bridge Module Changes

In addition to the native SDK v5-to-v6 migration, the React Native bridge layer was refactored to consolidate modules. Several modules were renamed, removed, or merged.

### Module Renames

| v5 Module (ObjC Name) | v6 Module (ObjC Name) | Notes |
|---|---|---|
| `SetupModule` (`AdyenSetup`) | `ContextModule` (`AdyenContext`) | Unified lifecycle + headless APIs. Also absorbed session creation from `SessionHelperModule` and Apple Pay callbacks from `ApplePayModule`. |
| `EmbeddedComponentBusModule` (`AdyenComponentBus`) | `ComponentModule` (`AdyenComponent`) | View event bus for embedded components. Same per-viewId proxy architecture, renamed class and registration. |

### Modules Removed

| v5 Module | Disposition |
|---|---|
| `ApplePayModule` | **Removed.** Apple Pay callback bridging (authorization, shipping, coupon) moved to `ContextModule+ApplePay.swift` extension. The `provide*` methods are now on `ContextModule`. |
| `GooglePayModule` | **Removed.** iOS had only a minimal stub; Google Pay is not available on iOS. `ContextModule.isAvailable("googlepay")` returns `false`. |
| `InstantModule` | **Removed.** Instant/headless payments are handled via `ContextModule` headless APIs (`isAvailable`, `requiresUserInteraction`, `submit`). |
| `SessionHelperModule` | **Consolidated into `ContextModule`.** Session creation (`setup`) is now a method on `ContextModule`. |

### ObjC Bridge Registration

The `AdyenModule.m` file now registers the following modules:

```objc
RCT_EXTERN_MODULE(AdyenDropIn, ...)     // DropInModule
RCT_EXTERN_MODULE(AdyenComponent, ...)  // ComponentModule (was EmbeddedComponentBusModule)
RCT_EXTERN_MODULE(AdyenCSE, ...)        // AdyenCSEModule (unchanged)
RCT_EXTERN_MODULE(AdyenContext, ...)    // ContextModule (replaces SetupModule, SessionHelperModule, ApplePayModule, InstantModule)
RCT_EXTERN_MODULE(AdyenAction, ...)     // ActionModule (unchanged)
```

---

## Configuration System

### Before (v5)

- `RootConfigurationParser` constructed an `AdyenContext` from `APIContext` + `Payment`.
- `ClientKeyValidator` validated the client key.
- Card configuration was built via `CardComponent.Configuration`.

### After (v6)

`RootConfigurationParser` now builds a `CheckoutConfiguration` using a result-builder DSL:

```swift
// RootConfigurationParser.swift
internal func checkoutConfiguration(
    amount: Amount? = nil,
    @CheckoutConfigurationBuilder content: () throws -> CheckoutConfigurable
) throws -> CheckoutConfiguration {
    let config = try CheckoutConfiguration(
        environment: environment,
        amount: amount ?? self.amount,
        clientKey: clientKey,
        analyticsConfiguration: analytics,
        content: content
    )
    // Optional theme support
    guard let theme = AdyenAppearanceLoader.findStyle() else {
        return config
    }
    return config.theme(theme)
}
```

Each module passes its component configurations through the builder closure:

```swift
// DropInModule.swift
let checkoutConfiguration = try parser.checkoutConfiguration {
    cardConfiguration        // CardConfiguration
    authenticationConfiguration  // AuthenticationConfiguration
}
```

**Card configuration** uses fluent modifiers instead of direct property assignment:

```swift
// CardConfigurationParser.swift
var configuration = CardConfiguration()
    .showCardholderName(showsHolderNameField)
    .showStorePaymentMethod(showsStorePaymentMethodField)
    .showSecurityCode(showsSecurityCodeField)
    .showSecurityCodeForStoredCard(showsStoredSecurityCodeField)
    .koreanAuthenticationVisibility(kcpVisibility)
    .socialSecurityNumberVisibility(socialSecurityVisibility)
    .billingAddressMode(billingAddressMode)
```

Optional configuration is applied conditionally:

```swift
if let supportedCardBrands {
    configuration = configuration.supportedCardBrands(supportedCardBrands)
}
if let installmentConfiguration {
    configuration = configuration.installmentConfiguration(installmentConfiguration)
}
if let onBinChange {
    configuration = configuration.onBinChange(onBinChange)
}
if let onBinLookup {
    configuration = configuration.onBinLookup(onBinLookup)
}
```

**Theme support** is applied via the `.theme()` modifier on `CheckoutConfiguration`. The `AdyenAppearanceProvider` protocol now returns `CheckoutTheme` instead of the v5 `DropInComponent.Style`.

**3DS configuration** is now `AuthenticationConfiguration` (was `ThreeDS2Component.Configuration`):

```swift
// ThreeDSConfigurationParser.swift
public var configuration: AuthenticationConfiguration {
    var configuration = AuthenticationConfiguration()
    if let requestorAppUrl, let url = URL(string: requestorAppUrl) {
        configuration = configuration.requestorAppURL(url)
    }
    return configuration
}
```

**DropInComponent.Configuration** was removed -- it became `package`-internal in v6 and is no longer instantiated by the bridge.

---

## Entry Points

### Before (v5)

```swift
// DropIn
let dropIn = DropInComponent(paymentMethods: paymentMethods, context: context, configuration: config)

// Session
AdyenSession.initialize(with: sessionConfig, delegate: self, presentationDelegate: self) { result in ... }

// Components
let card = CardComponent(paymentMethod: method, context: context, configuration: cardConfig)
```

### After (v6)

All entry points go through `Checkout.setup()`, which is an async method:

```swift
// Advanced flow -- returns AdvancedCheckout
let checkout = try await Checkout.setup(
    with: paymentMethods,               // PaymentMethods
    configuration: checkoutConfiguration, // CheckoutConfiguration
    presentationDelegate: self            // PresentationDelegate
)

// Session flow -- returns SessionCheckout
let checkout = try await Checkout.setup(
    with: sessionResponse,               // SessionResponse
    configuration: checkoutConfiguration, // CheckoutConfiguration
    presentationDelegate: self            // PresentationDelegate
)

// Action-only flow -- returns ActionOnlyCheckout
let checkout = try await Checkout.setup(
    configuration: checkoutConfiguration,
    presentationDelegate: self
)
```

Components are created from the checkout object:

```swift
let component = try checkout.createPaymentComponent(for: paymentMethod.type)
// or for a specific type:
let component = try checkout.createPaymentComponent(for: .scheme)
let component = try checkout.createPaymentComponent(for: .applePay)
```

The returned `CheckoutPaymentComponent` provides `.viewController` (optional -- `nil` for direct-submit methods) and `.requiresUserInteraction` to decide whether to present UI or submit directly.

---

## Callback System

### Before (v5) -- Protocol Delegates

The bridge conformed to multiple delegate protocols:

| Protocol | Purpose |
|---|---|
| `PaymentComponentDelegate` | `didSubmit`, `didFail` |
| `ActionComponentDelegate` | `didProvide`, `didFail`, `didComplete`, `didOpenExternalApp` |
| `CardComponentDelegate` | `didChangeBIN`, `didSubmit` |
| `DropInComponentDelegate` | Combined drop-in lifecycle |
| `StoredPaymentMethodsDelegate` | `didDisableStoredPaymentMethod` |
| `PartialPaymentDelegate` | `checkBalance`, `requestOrder` |
| `AdyenSessionDelegate` | Session-specific overrides |
| `ApplePayComponentDelegate` / `ApplePayAuthorizationDelegate` | Apple Pay sheet callbacks |

These were implemented in extension files:
- `BaseModuleSender+Delegates.swift`
- `DropInModule+Delegates.swift`

### After (v6) -- Closure Callbacks

All delegate protocols have been removed (they are `package`-internal in v6). The bridge now wires closures on the checkout object:

```swift
// BaseModuleSender+Callbacks.swift
@MainActor
internal func setupCallbacks(on checkout: AdvancedCheckout) {
    self.checkout = checkout
    _ = checkout
        .onSubmit { [weak self] data in
            await self?.awaitSubmitResult(for: data) ?? .retry()
        }
        .onAdditionalDetails { [weak self] data in
            await self?.awaitAdditionalDetailsResult(for: data) ?? .completion(resultCode: "")
        }
        .onComplete { [weak self] result in
            self?.sendCompleteEvent(resultCode: result.resultCode)
        }
        .onFailure { [weak self] error in
            self?.sendError(error: error)
        }
}
```

For the action-only flow:

```swift
// BaseActionModule.swift
@MainActor
internal func setupActionCallbacks(on checkout: ActionOnlyCheckout) {
    self.checkout = checkout
    _ = checkout
        .onAdditionalDetails { [weak self] data in
            await self?.awaitAdditionalDetailsResult(for: data) ?? .completion(resultCode: "")
        }
        .onComplete { [weak self] result in
            self?.sendCompleteEvent(resultCode: result.resultCode)
        }
        .onFailure { [weak self] error in
            self?.sendError(error: error)
        }
}
```

For the session flow (now in `ContextModule`):

```swift
// ContextModule.swift
@MainActor
private func setupSessionCallbacks(on checkout: SessionCheckout, sessionData: String) {
    _ = checkout
        .onComplete { [weak self] result in
            self?.sendCompleteEvent(result: result, sessionData: sessionData)
        }
        .onFailure { [weak self] error in
            self?.sendError(error: error)
        }
}
```

### JS Response Bridging

The `onSubmit` and `onAdditionalDetails` closures are async -- they must return a result (`SubmitResult` or `AdditionalDetailsResult`). The bridge suspends these closures using `CheckedContinuation` until JavaScript responds:

```swift
@MainActor
internal func awaitSubmitResult(for data: PaymentComponentData) async -> SubmitResult {
    sendSubmitEvent(data: data)
    return await withCheckedContinuation { continuation in
        self.submitContinuation = continuation
    }
}
```

Three new JS-callable methods resume these continuations (replacing the removed `providePaymentResult` and `provideAdditionalDetailsResult`):

- **`action(_:)`** -- Resumes `submitContinuation` with `.action(action)`. Replaces the action-handling aspect of the former `handle()` method.
- **`completion(_:)`** -- Resumes `submitContinuation` or `additionalDetailsContinuation` with `.completion(resultCode:)`. Replaces the former `hide(true)` pattern.
- **`retry(_:)`** -- Resumes `submitContinuation` with `.retry(errorMessage:)`. Replaces the former `hide(false, message)` pattern.

---

## Files Added

| File | Purpose |
|---|---|
| `ios/Model/Payment.swift` | Bridge-local `Payment` struct (amount + countryCode). Replaces the removed `Adyen.Payment` type that was used for Apple Pay `PKPaymentRequest` construction. |
| `ios/Components/Base/BaseModuleSender+Callbacks.swift` | Closure callback wiring for the advanced flow. Contains `setupCallbacks(on:)`, `resolveSubmit(_:)`, `resolveAdditionalDetails(_:)`, and the `awaitSubmitResult` / `awaitAdditionalDetailsResult` suspension helpers. |
| `ios/Components/ContextModule.swift` | Replaces `SetupModule`. Unified lifecycle module (`@objc(AdyenContext)`) that handles session creation, advanced-flow setup, headless APIs (`isAvailable`, `requiresUserInteraction`, `submit`), and cleanup. |
| `ios/Components/ContextModule+ApplePay.swift` | Apple Pay callback bridging extension. Builds `ApplePayConfiguration` and wires authorization, shipping, and coupon closures via `CheckedContinuation`. Replaces the removed `ApplePayModule`. |
| `ios/Components/ContextModule+Advanced.swift` | Advanced-flow wiring extension. Contains `setupAdvancedCallbacks(on:)` with `onSubmit`, `onAdditionalDetails`, `onComplete`, `onFailure` closures that emit viewId-tagged React Native events. |
| `ios/Components/ComponentModule.swift` | Replaces `EmbeddedComponentBusModule`. Per-viewId view event bus (`@objc(AdyenComponent)`) managing `ComponentProxy` instances for embedded component lifecycle. |
| `ios/Views/AdyenComponentView/ADYAdyenComponentView.h` | New generic Objective-C++ view header for embedded components. Replaces the removed type-specific `ADYCardView` and `ADYPlatformPayView`. |
| `ios/Views/AdyenComponentView/ADYAdyenComponentView.mm` | New generic Objective-C++ view implementation for embedded components. |
| `ios/Views/AdyenComponentView/AdyenComponentViewProxy.swift` | Swift proxy backing the new generic embedded component view. Replaces `CardComponentViewProxy`. |

---

## Files Removed

| File | Reason |
|---|---|
| `ios/Model/EncodableBalance.swift` | Partial payments not yet supported in v6 alpha. |
| `ios/Model/CancelOrderData.swift` | Partial payments not yet supported in v6 alpha. |
| `ios/Components/Base/BaseModuleSender+Delegates.swift` | v5 delegate conformances (`PaymentComponentDelegate`, `ActionComponentDelegate`, `CardComponentDelegate`). Replaced by closure callbacks. |
| `ios/Components/SetupModule.swift` | Replaced by `ContextModule.swift`. Lifecycle and setup APIs consolidated under `@objc(AdyenContext)`. |
| `ios/Components/SessionHelperModule.swift` | Session creation consolidated into `ContextModule.setup()`. |
| `ios/Components/ApplePay/ApplePayModule.swift` | Apple Pay bridging moved to `ContextModule+ApplePay.swift` extension. |
| `ios/Components/ApplePay/ApplePayModule+Delegates.swift` | v5 Apple Pay delegate conformances removed; callback closures now in `ContextModule+ApplePay.swift`. |
| `ios/Components/ApplePay/ApplePayModuleUtilities.swift` | Apple Pay utilities consolidated into `ContextModule+ApplePay.swift`. |
| `ios/Components/GooglePayModule.swift` | Removed. Google Pay is not available on iOS; `ContextModule.isAvailable("googlepay")` returns `false`. |
| `ios/Components/InstantModule.swift` | Removed. Headless/instant payments handled via `ContextModule` headless APIs. |
| `ios/Components/Embedded/EmbeddedComponentBusModule.swift` | Replaced by `ComponentModule.swift` with the same per-viewId proxy architecture. |
| `ios/Views/ADYCardView.h` | Replaced by generic `ADYAdyenComponentView.h`. |
| `ios/Views/ADYCardView.mm` | Replaced by generic `ADYAdyenComponentView.mm`. |
| `ios/Views/ADYPlatformPayView.h` | Replaced by generic `ADYAdyenComponentView.h`. |
| `ios/Views/ADYPlatformPayView.mm` | Replaced by generic `ADYAdyenComponentView.mm`. |
| `ios/Views/CardComponentViewProxy.swift` | Replaced by generic `AdyenComponentViewProxy.swift`. |

---

## Module-by-Module Changes

### ContextModule (AdyenContext)

**Files:** `ios/Components/ContextModule.swift`, `ios/Components/ContextModule+ApplePay.swift`, `ios/Components/ContextModule+Advanced.swift`

This is a new module that consolidates `SetupModule`, `SessionHelperModule`, `ApplePayModule`, and `InstantModule` into a single `@objc(AdyenContext)` bridge module. It inherits from `BaseModule` and conforms to `SessionErrorDelegate`.

#### Session Flow (`setup`)

Creates a `SessionCheckout` via `Checkout.setup(with: SessionResponse, ...)`. Calls `performCleanup()` first to dispose of any prior checkout state. Wires `onComplete` and `onFailure` closures via `setupSessionCallbacks(on:sessionData:)`. Stores the checkout on `BaseModule.checkoutContext` and returns a `SessionDTO` to JS containing the session ID, session data, and payment methods.

```swift
@objc
func setup(_ sessionModelJSON: NSDictionary,
           configuration: NSDictionary,
           resolver: @escaping RCTPromiseResolveBlock,
           rejecter: @escaping RCTPromiseRejectBlock)
```

#### Advanced Flow (`setupAdvanced`)

Creates an `AdvancedCheckout` via `Checkout.setup(with: PaymentMethods, ...)`. Calls `performCleanup()` first. Wires `onSubmit`, `onAdditionalDetails`, `onComplete`, `onFailure` closures via `setupAdvancedCallbacks(on:)` (defined in `ContextModule+Advanced.swift`). Stores the checkout on `BaseModule.checkoutContext`.

```swift
@objc
func setupAdvanced(_ paymentMethodsDict: NSDictionary,
                   configuration: NSDictionary,
                   resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock)
```

The `setupAdvancedCallbacks(on:)` method in `ContextModule+Advanced.swift` wires the advanced-flow closures with viewId-tagged event emission:

```swift
@MainActor
internal func setupAdvancedCallbacks(on checkout: AdvancedCheckout) {
    _ = checkout
        .onSubmit { [weak self] data in
            await self?.awaitSubmitResult(for: data) ?? .retry()
        }
        .onAdditionalDetails { [weak self] data in
            await self?.awaitAdditionalDetailsResult(for: data) ?? .completion(resultCode: "")
        }
        .onComplete { [weak self] result in
            self?.sendCompleteEvent(resultCode: result.resultCode)
        }
        .onFailure { [weak self] error in
            self?.sendError(error: error)
        }
}
```

#### Headless APIs

- **`isAvailable(_ type:)`** -- Checks payment method availability. For `.applePay`, verifies both that an Apple Pay payment method exists in `paymentMethods` and that `PKPaymentAuthorizationViewController.canMakePayments()` returns `true`. For `.googlePay`, always returns `false` (not available on iOS). For other types, checks `paymentMethods` for a matching type.

- **`requiresUserInteraction(_ type:)`** -- Builds (and caches) a `CheckoutPaymentComponent` for the given type via `resolveComponent(for:checkout:)`, then returns `component.requiresUserInteraction`.

- **`submit(_ type:)`** -- Retrieves a cached component (or builds one) and calls `component.submit()` to trigger a direct submission without UI.

#### Cleanup

- **`cleanup()`** -- JS-callable explicit cleanup, delegates to `performCleanup()`.
- **`performCleanup()`** -- Clears cached `components` dictionary, resumes any pending `submitContinuation` (with `.retry()`) and `additionalDetailsContinuation` (with `.completion(resultCode: "")`), nils them out, then calls `cleanUp()` on the base module. Invoked at the start of `setup` and `setupAdvanced` to prevent stale state.

#### JS Response Methods

- **`action(_ actionJson:)`** -- Resumes `submitContinuation` with `.action(action)` when a submit is pending. No-op otherwise.
- **`completion(_ resultCode:)`** -- Resumes `submitContinuation` or `additionalDetailsContinuation` with `.completion(resultCode:)`. Falls through to `BaseModule.currentModule?.completion()` for session/UI flows.
- **`retry(_ message:)`** -- Resumes `submitContinuation` with `.retry(errorMessage:)`. Falls through to `BaseModule.currentModule?.retry()` for session/UI flows.

#### Apple Pay Integration (`ContextModule+ApplePay.swift`)

The `ApplePayModule` class was removed. All Apple Pay callback bridging is now handled via `ContextModule+ApplePay.swift`.

**Configuration building:**

```swift
internal func makeApplePayConfiguration(parser: RootConfigurationParser,
                                        configuration: NSDictionary) throws -> ApplePayConfiguration?
```

Returns `nil` when no merchant ID or payment is configured. When present, builds `ApplePayConfiguration` via `ApplepayConfigurationParser.buildConfiguration(payment:)` and attaches async closures:

```swift
private func attachCallbacks(to base: ApplePayConfiguration) -> ApplePayConfiguration {
    var configuration = base
        .onAuthorize { [weak self] payment in
            await self?.awaitAuthorization(payment: payment) ?? ...
        }
        .onSelectShippingContact { [weak self] contact, summaryItems in
            await self?.awaitShippingContact(contact: contact, summaryItems: summaryItems) ?? ...
        }
        .onSelectShippingMethod { [weak self] shippingMethod, summaryItems in
            await self?.awaitShippingMethod(shippingMethod: shippingMethod, summaryItems: summaryItems) ?? ...
        }
    if #available(iOS 15.0, *) {
        configuration = configuration.onChangeCouponCode { ... }
    }
    return configuration
}
```

Each callback emits a React Native event and suspends on a handler (closure-based, not `CheckedContinuation`) until JS responds via the corresponding `provide*` method:

- **`provideAuthorizationResult(_ result:)`** -- Resumes `authorizationHandler` with `PKPaymentAuthorizationResult`.
- **`provideShippingContactUpdate(_ update:)`** -- Resumes `shippingContactHandler` with `PKPaymentRequestShippingContactUpdate`.
- **`provideShippingMethodUpdate(_ update:)`** -- Resumes `shippingMethodHandler` with `PKPaymentRequestShippingMethodUpdate`.
- **`provideCouponCodeUpdate(_ update:)`** (iOS 15.0+) -- Resumes `couponCodeHandler` with `PKPaymentRequestCouponCodeUpdate`.

The handler state properties (`authorizationHandler`, `shippingContactHandler`, `shippingMethodHandler`, `couponCodeHandler`, `currentSummaryItems`, `currentShippingMethods`) are stored on `ContextModule` because Swift extensions cannot declare stored properties.

### ComponentModule (AdyenComponent)

**File:** `ios/Components/ComponentModule.swift`

Replaces the former `EmbeddedComponentBusModule`. Registered as `@objc(AdyenComponent)` (was `@objc(AdyenComponentBus)`).

| Aspect | v5 (EmbeddedComponentBusModule) | v6 (ComponentModule) |
|---|---|---|
| **ObjC name** | `AdyenComponentBus` | `AdyenComponent` |
| **Architecture** | Per-viewId `ComponentProxy` instances | Same architecture (unchanged) |
| **Registration** | `register(viewId:)` / `unregister(viewId:)` | Same (unchanged) |
| **Command routing** | `handle`/`hide` via viewId | `action`/`completion`/`retry` via viewId |

**View event bus:** Per-viewId `ComponentProxy` instances are created via `register(viewId:)` and disposed via `unregister(viewId:)`. Each proxy owns its own checkout flow and payment component.

**JS-callable methods (all routed by viewId):**

- **`subscribe(_ viewId:)`** -- Registers a view for event delivery.
- **`unsubscribe(_ viewId:)`** -- Unregisters the view, disposes its proxy and lookup handlers. Triggers full cleanup when no subscribed views remain.
- **`action(_ viewId:actionDict:)`** -- Parses an action and forwards it to the proxy via `proxy.handle(action:)`.
- **`completion(_ viewId:resultCode:)`** -- Resolves the proxy's completion continuation, unregisters the view, and dismisses if all delegates are done.
- **`retry(_ viewId:message:)`** -- Resolves the proxy's retry continuation, unregisters the view, and dismisses if all delegates are done. The `message` parameter is nullable (`NSString?`); nil or empty strings are treated as no error message.
- **`update(_ viewId:results:)`** -- Forwards address lookup results to the stored lookup handler for the view.
- **`confirm(_ viewId:success:address:)`** -- Forwards address selection confirmation to the stored lookup completion handler. The `address` parameter is nullable (`NSDictionary?`); nil with `success: false` uses a default rejection message.

### DropInModule

**File:** `ios/Components/DropIn/DropInModule.swift`

| Aspect | v5 | v6 |
|---|---|---|
| **Initialization** | `DropInComponent(paymentMethods:, context:, configuration:)` | `Checkout.setup(with: paymentMethods, configuration:, presentationDelegate:)` returns `AdvancedCheckout` |
| **Session flow** | Created `DropInComponent` with session context | Reuses `SessionCheckout` from `BaseModule.checkoutContext` |
| **Component presentation** | Presented `DropInComponent` directly (showed payment method list) | Creates individual `CheckoutPaymentComponent` via `checkout.createPaymentComponent(for:)`. No public Drop-in list in v6. |
| **Delegates** | Conformed to `DropInComponentDelegate`, `StoredPaymentMethodsDelegate`, `PartialPaymentDelegate` | Closures via `setupCallbacks(on:)` |
| **Action handling** | `handle(_:)` called `dropInComponent.handle(action:)` | `action(_:)` checks for pending `submitContinuation` first (resumes with `.action`), otherwise falls back to `checkout?.handle(action:)`. The former `handle()` method is replaced by `action()`. |
| **Address lookup** | N/A or via delegate | Async closures via `withCheckedContinuation` in `awaitAddressLookup` and `awaitAddressSelection` |

**Drop-in is effectively disabled in v6 alpha.** The `start()` method returns `ModuleException.notSupported` immediately without creating a `DropInComponent`. The v5 code is preserved as comments for reference during future migration.

**`DropInModule+Delegates.swift`** still exists but contains stub implementations that send `ModuleException.notSupported`. The file implements `DropInComponentDelegate`, `StoredPaymentMethodsDelegate`, and `PartialPaymentDelegate` conformances, but since `start()` short-circuits, these delegates are never invoked at runtime.

New property:
```swift
private var paymentComponent: CheckoutPaymentComponent?
```

### ActionModule (AdyenAction)

**File:** `ios/CSE/ActionModule.swift`

`ActionModule` inherits from `BaseModule` (not `BaseActionModule`). It manages its own standalone action-only checkout flow with a local `setupCallbacks(on:)` method.

| Aspect | v5 | v6 |
|---|---|---|
| **Inheritance** | `BaseModule` | `BaseModule` (unchanged) |
| **Setup** | `RedirectComponent` / `Adyen3DS2Component` with delegate | `Checkout.setup(configuration:, presentationDelegate:)` returns `ActionOnlyCheckout` |
| **Delegates** | Conformed to `ActionComponentDelegate` | Closure callbacks via local `setupCallbacks(on:)` |
| **Result flow** | Delegate `didProvide` -> resolve promise, `didComplete` -> resolve, `didFail` -> reject | `.onAdditionalDetails { }` -> resolve promise, `.onComplete { }` -> resolve, `.onFailure { }` -> reject |
| **Teardown** | `hide(_ success:)` | `hide(_ success:)` (unchanged -- still uses `hide()`, not `completion()`/`retry()`) |

The `hide(_ success:)` method remains on `ActionModule` -- it nils out the resolver/rejecter and calls `dismiss()`. This is distinct from the `completion()`/`retry()` pattern used by `ContextModule` and `BaseModuleSender`, because `ActionModule` bridges to a JS promise rather than the event-based callback system.

New property:
```swift
private var actionCheckout: ActionOnlyCheckout?
```

### CSEModule (AdyenCSEModule)

**File:** `ios/CSE/AdyenCSEModule.swift`

No significant changes. The `CardEncryptor`, `CardNumberValidator`, `CardExpiryDateValidator`, and `CardSecurityCodeValidator` APIs are unchanged in v6.

### BaseModule

**File:** `ios/Components/Base/BaseModule.swift`

| Aspect | v5 | v6 |
|---|---|---|
| **Session storage** | `AdyenSession?` (via `session`) | `SessionCheckout?` (via `checkoutContext`; `session` property removed) |
| **Presenter stack** | Managed via `presenterStack` array | Same pattern (unchanged) |
| **PresentationDelegate** | `present(component: PresentableComponent)` | Same signature (unchanged) |
| **Error checking** | `ComponentError.cancelled` | `CheckoutError.Code.cancelled` via `.isComponentCanceled` |
| **Lifecycle** | `hide(_ success:, event:)` | `completion(_ resultCode:)` and `retry(_ message:)` replace the former `hide()` |

### BaseModuleSender

**File:** `ios/Components/Base/BaseModuleSender.swift`

New properties added for v6 callback system:

```swift
internal var checkout: BaseCheckout?
internal var submitContinuation: CheckedContinuation<SubmitResult, Never>?
internal var additionalDetailsContinuation: CheckedContinuation<AdditionalDetailsResult, Never>?
```

New JS-callable methods (replacing the removed `providePaymentResult` and `provideAdditionalDetailsResult`):
- `action(_:)` -- resumes `submitContinuation` with `.action(action)` for action handling
- `completion(_:)` -- resumes `submitContinuation` or `additionalDetailsContinuation` with `.completion(resultCode:)` for payment completion
- `retry(_:)` -- resumes `submitContinuation` with `.retry(errorMessage:)` for retryable errors

Cleanup now disposes of continuations:

```swift
override func cleanUp() {
    ensureMainThread { [weak self] in
        self?.checkout = nil
        self?.submitContinuation?.resume(returning: .retry())
        self?.submitContinuation = nil
        self?.additionalDetailsContinuation?.resume(returning: .completion(resultCode: ""))
        self?.additionalDetailsContinuation = nil
    }
    super.cleanUp()
}
```

### BaseActionModule

**File:** `ios/Components/Base/BaseActionModule.swift`

New method `setupActionCallbacks(on:)` wires closures for the `ActionOnlyCheckout`. This is used by modules that extend `BaseActionModule` (note: `ActionModule` itself inherits from `BaseModule` and has its own local `setupCallbacks` method).

The `action(_:)` method now forwards actions to `checkout?.handle(action:)` instead of a retained `ActionHandlingComponent`. The former `handle(_:)` method has been replaced by `action(_:)`.

### BaseAddressModule

**File:** `ios/Components/Base/BaseAddressModule.swift`

Minimal changes. The address lookup/completion handler pattern remains similar. The main difference is that address lookup callbacks are now wired via `CardConfiguration` closures (async) rather than through a `CardComponentDelegate`.

### ComponentProxy

**File:** `ios/Components/ComponentProxy/ComponentProxy.swift`

This is a new v6 class annotated with `@MainActor`. Each proxy:

- Owns a `PaymentCheckout` and `CheckoutPaymentComponent` for a single embedded view
- Has its own `submitContinuation` and `additionalDetailsContinuation`
- Wires `setupCallbacks(on:)` with closures that tag events with `viewId`
- Handles BIN change and BIN lookup via `CardConfiguration` closures (`.onBinChange`, `.onBinLookup`)
- Handles address lookup/selection via async closures with `CheckedContinuation`

Key creation method:

```swift
@MainActor
func makeViewController(paymentMethod: NSDictionary, configuration: NSDictionary) async throws -> UIViewController? {
    let checkout = try await resolveCheckout(paymentMethod: paymentMethod, configuration: configuration)
    self.checkout = checkout
    let component = try checkout.createPaymentComponent(for: .scheme)
    paymentComponent = component
    return component.viewController
}
```

---

## Bridge Nullability

The following parameters are nullable in the ObjC bridge registration and handled safely in the Swift implementation:

| Module | Method | Nullable Parameter | Handling |
|---|---|---|---|
| `ComponentModule` | `retry(viewId:message:)` | `message: NSString?` | Nil or empty string treated as no error message |
| `ComponentModule` | `confirm(viewId:success:address:)` | `address: NSDictionary?` | Nil with `success: false` uses default rejection message (`"Address lookup was rejected."`); nil with `success: true` produces `"Address lookup confirmation is missing address data."` error |
| `ComponentModule` | `action(viewId:actionDict:)` | `actionDict: NSDictionary?` | Nil is a no-op (guard returns early) |
| `ComponentModule` | `update(viewId:results:)` | `results: NSArray?` | Nil treated as empty array |

---

## Redirect Handling

### Before (v5)

```swift
RedirectComponent.applicationDidOpen(from: url)
```

This was a public API on `RedirectComponent`.

### After (v6)

The `RedirectComponentProxy` uses a dual-path strategy via `#if canImport(AdyenActions)`:

```swift
// RedirectComponentProxy.swift
@MainActor
public class func proccessURL(_ url: URL) -> Bool {
    #if canImport(AdyenActions)
        // Modular build (SPM / dynamic frameworks)
        return Checkout.handleReturn(url: url)
    #else
        // Umbrella CocoaPods build: `RedirectComponent.applicationDidOpen(from:)` is
        // reachable because the bridge compiles into the `com.adyen.checkout` package.
        return RedirectComponent.applicationDidOpen(from: url)
    #endif
}
```

The Objective-C wrapper (`ADYRedirectComponent`) now imports the `adyen_react_native` module to access `RedirectComponentProxy`:

```objc
// ADYRedirectComponent.m
#if __has_include("adyen_react_native-Swift.h")
#import "adyen_react_native-Swift.h"
#else
#import "adyen_react_native/adyen_react_native-Swift.h"
#endif

+ (BOOL)applicationDidOpenURL:(nonnull NSURL *)url {
    return [RedirectComponentProxy proccessURL: url];
}
```

---

## Swift Concurrency

### `@MainActor` Isolation

All UI-presenting and state-mutating methods are annotated with `@MainActor`:

- `setupCallbacks(on:)` / `setupActionCallbacks(on:)` / `setupSessionCallbacks(on:)`
- `setupAdvancedCallbacks(on:)` (in `ContextModule+Advanced.swift`)
- `awaitSubmitResult(for:)` / `awaitAdditionalDetailsResult(for:)`
- `awaitAuthorization(payment:)` / `awaitShippingContact(...)` / `awaitShippingMethod(...)` / `awaitCouponCode(...)` (in `ContextModule+ApplePay.swift`)
- `presentPaymentComponent(...)` / `present(viewController:)`
- `ComponentProxy` (entire class is `@MainActor`)
- `ContextModule.performCleanup()` (requires `@MainActor`)

### `ensureMainThread` Helper

A new helper function bridges between `DispatchQueue.main` and `@MainActor`:

```swift
// ThreadUtilities.swift
internal func ensureMainThread(_ work: @escaping @MainActor () -> Void) {
    if Thread.isMainThread {
        MainActor.assumeIsolated(work)
    } else {
        DispatchQueue.main.async { MainActor.assumeIsolated(work) }
    }
}
```

### `async/await` Usage

- Checkout setup: `try await Checkout.setup(...)`
- Address lookup: `await withCheckedContinuation { ... }` / `try await withCheckedThrowingContinuation { ... }`
- Apple Pay callbacks: `await withCheckedContinuation { ... }`

### `CheckedContinuation` Types

| Continuation | Type | Used For |
|---|---|---|
| `submitContinuation` | `CheckedContinuation<SubmitResult, Never>` | Bridging `onSubmit` closure to JS `/payments` response |
| `additionalDetailsContinuation` | `CheckedContinuation<AdditionalDetailsResult, Never>` | Bridging `onAdditionalDetails` closure to JS `/payments/details` response |
| Address lookup handler | `CheckedContinuation<[AddressLookupResult], Never>` | Local in `awaitAddressLookup` |
| Address selection handler | `CheckedContinuation<PostalAddress, Error>` (throwing) | Local in `awaitAddressSelection` |
| Apple Pay authorization | Handler closure `(PKPaymentAuthorizationResult) -> Void` | In `ContextModule` -- stored property, not `CheckedContinuation` |
| Apple Pay shipping/coupon | Handler closures `(PKPaymentRequest*Update) -> Void` | In `ContextModule` -- stored properties, not `CheckedContinuation` |

### `Task` Dispatch Pattern

All async entry points from `@objc` methods use the pattern:

```swift
Task { @MainActor [weak self] in
    guard let self else { return }
    do {
        // async work
    } catch {
        self.sendError(error: error)
    }
}
```

---

## Error Handling

### Before (v5)

```swift
// Cancellation check
error is ComponentError  // ComponentError.cancelled
```

### After (v6)

```swift
// ModuleException.swift
var isComponentCanceled: Bool {
    (self as? CheckoutError)?.code == .cancelled
}
```

`ComponentError` has been replaced by `CheckoutError` with a `.cancelled` code. The `ModuleException` enum and error codes remain the same; only the underlying SDK error type changed.

An additional check was added for invalid client key responses:

```swift
var isEmpty401NetworkingResponseError: Bool {
    self is HTTPResponse<EmptyErrorResponse>
}
```

---

## Known Alpha Limitations

1. **Drop-in is effectively disabled** -- `DropInModule.start()` returns `ModuleException.notSupported` immediately. The v6 SDK does not expose a public Drop-in component that shows a list of payment methods. `DropInModule+Delegates.swift` contains stub delegate implementations that also send `notSupported`.

2. **ApplePayModule, GooglePayModule, InstantModule removed** -- All consolidated into `ContextModule`. Apple Pay callbacks route through `ContextModule+ApplePay.swift`. Instant/headless payments use the `ContextModule` headless APIs (`isAvailable`, `requiresUserInteraction`, `submit`). Google Pay is not available on iOS.

3. **Partial payments** -- `provideBalance` and `provideOrder` are not supported. The `checkBalance`, `requestOrder`, and `cancelOrder` event names are retained in `EventName` but the delegate conformances (`PartialPaymentDelegate`) have been removed. The files `EncodableBalance.swift` and `CancelOrderData.swift` have been deleted.

4. **Stored payment method removal** -- `onDisableStoredPaymentMethod` is not supported. The `disableStoredPaymentMethod` event name is retained in `EventName` but the `StoredPaymentMethodsDelegate` conformance has been removed.

5. **Session-flow embedded component callbacks** -- When using the session flow with `ComponentProxy`, the `CardConfiguration` closures for BIN lookup (`onBinChange`, `onBinLookup`) and address lookup cannot be injected because the `SessionCheckout` was already created by `ContextModule` with its own `CheckoutConfiguration`. The proxy reuses `BaseModule.checkoutContext` directly.

6. **Session-flow Apple Pay** -- The `ApplePayConfiguration` (with its authorization/shipping closures) must be included in the initial `CheckoutConfiguration` passed to `Checkout.setup(with: SessionResponse, ...)`. It cannot be added after the `SessionCheckout` is created. `ContextModule.buildCheckoutConfiguration()` handles this by conditionally including the Apple Pay configuration in the builder DSL.
