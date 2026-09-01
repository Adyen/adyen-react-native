# React Native SDK v6 Alpha — API Migration Summary

## Overview

Complete public API redesign for `adyen-react-native` v6. The SDK moved from a React provider pattern to a static API, aligned callback signatures with native iOS/Android SDKs, introduced return-based callbacks, and consolidated native bridge state management.

**Branch:** `feat/v6-alpha-example-testing` (PR #1214 → `develop`)
**Repo:** `git@github.com:Adyen/adyen-react-native.git`
**Worktree:** `sdks/adyen-react-native-v6-alpha`
**Stats:** 7 commits, 259 files changed, 314 tests pass

---

## Commit History

| # | Hash | Description |
|---|------|-------------|
| 1 | `b4e9057b` | iOS/Android/TS bridge rewrite for v6 |
| 2 | `8064394c` | API redesign + docs (renames, dead code removal) |
| 3 | `ad3e6c21` | Option B: static API + example migration + docs |
| 4 | `79e3d799` | Native alignment (CheckoutState, cleanup terminal-only, remove currentModule) |
| 5 | `4f55f42d` | Return-based callbacks |
| 6 | `754a714f` | Cleanup: AdvancedPayment interface, factory methods, example app fixes |
| 7 | `e27487ac` | Flatten DropIn inheritance, fix open→start mismatch |

---

## Architecture Decisions

### 1. Static API (Option B) replaces React Provider

**Before (v5):** `<AdyenCheckout>` provider + `useAdyenCheckout()` hook + React context
**After (v6):** Static `AdyenCheckout.setup()` / `setupAdvanced()` returning a `Checkout` object

Why: The native SDKs don't have a singleton problem — each group should solve for its constraint. React context adds unnecessary coupling. The static API is simpler, supports multi-screen flows, and works equally well for DropIn and embedded components.

### 2. Return-based callbacks replace handler params

**Before:** `onSubmit(data, component) => { component.action(action) }`
**After:** `onSubmit(data) => { return SubmitResult.action(action) }`

Why: Return values are unbreakable — the consumer can't forget to respond. Handler objects let consumers silently "forget" to call a method. The native SDKs use async/suspend with return types (sealed classes/enums).

### 3. Terminal callbacks trigger auto-cleanup

`cleanup()` is private and only called from `onComplete`/`onError`. Not from re-setup, not from consumer code, not from component unmount. The lifecycle is deterministic: setup → use → terminal callback → auto-cleanup.

### 4. CheckoutState consolidates native state

Both Android and iOS had scattered static properties (`checkoutContext`, `storedConfigurationJSON`, `sessionDelegate`, `currentModule`). Now a single `CheckoutState` object with `isSession` auto-calculated from the checkout context type.

### 5. Direct DropIn routing from TS

Removed `currentModule` dispatch pattern. DropIn `action`/`completion`/`retry` route directly to `AdyenDropIn` native module from TypeScript, bypassing `ContextModule` indirection.

---

## Breaking Changes: v5 → v6

### Module Renames

| v5 | v6 |
|----|----|
| `SetupModule` / `AdyenSetup` | `ContextModule` / `AdyenContext` |
| `EmbeddedComponentBusModule` / `AdyenComponentBus` | `ComponentModule` / `AdyenComponent` |
| `EmbeddedComponentDelegateProxy` | `ComponentProxy` |

### Method Renames

| v5 | v6 |
|----|----|
| `createSession(...)` | `setup(session, config, callbacks)` |
| `setup(...)` | `setupAdvanced(paymentMethods, config, callbacks)` |
| `AdyenDropIn.open(paymentMethods, config)` | `AdyenDropIn.start(checkout)` |

### Removed APIs

- `<AdyenCheckout>` provider component
- `useAdyenCheckout()` hook
- `useComponent()` hook
- `useSubscriptionManager()` hook
- `GooglePayModule` / `AdyenGooglePay`
- `ApplePayModule` / `AdyenApplePay`
- `InstantModule` / `AdyenInstant`
- `<CardView>`, `<GooglePayButton>`, `<ApplePayButton>` → replaced by `<AdyenComponent>`
- `struct Payment` (iOS)
- `BaseModule.session`, `BaseModuleSender.checkout`, `DropInModule.currentComponent` (iOS)
- `PaymentSubmitResultHandler`, `PaymentAdditionalResultHandler`, `PaymentResultHandler`, `BeforeSubmitHandler` interfaces
- `checkout.cleanup()` (removed from public `Checkout` interface)
- `PaymentComponentWrapper`, `AddressLookupModule` base classes
- `processError` utility

---

## Current Public API

### Setup

```typescript
// Session flow
const checkout = await AdyenCheckout.setup(
  { id: sessionId, sessionData },
  configuration,
  {
    onComplete(result: SessionsResult) { /* terminal */ },
    onError(error: AdyenError) { /* terminal */ },
    async onBeforeSubmit(data: BeforeSubmitData): Promise<BeforeSubmitResult> {
      return BeforeSubmitResult.proceed(data);
    },
  }
);

// Advanced flow
const checkout = await AdyenCheckout.setupAdvanced(
  paymentMethods,
  configuration,
  {
    async onSubmit(data: PaymentMethodData): Promise<SubmitResult> {
      const res = await fetch('/payments', { body: JSON.stringify(data) });
      if (res.action) return SubmitResult.action(res.action);
      return SubmitResult.completed(res.resultCode);
    },
    async onAdditionalDetails(data: PaymentDetailsData): Promise<AdditionalDetailsResult> {
      const res = await fetch('/payments/details', { body: JSON.stringify(data) });
      return AdditionalDetailsResult.completed(res.resultCode);
    },
    onComplete(result: PaymentResult) { /* terminal */ },
    onError(error: AdyenError) { /* terminal */ },
  }
);
```

### Checkout Object

```typescript
interface Checkout {
  readonly paymentMethods: PaymentMethodsResponse;
  isAvailable(type: string): Promise<boolean>;
  requiresUserInteraction(type: string): Promise<boolean>;
  submit(type: string): void;
}
```

### Components

```tsx
// Embedded component (any payment method type)
<AdyenComponent checkout={checkout} type="scheme" />
<AdyenComponent checkout={checkout} type="googlepay" />
<AdyenComponent checkout={checkout} type="applepay" />

// DropIn
AdyenDropIn.start(checkout);
```

### Result Types

```typescript
// onSubmit returns one of:
SubmitResult.action(action)         // forward action to SDK (3DS, redirect)
SubmitResult.completed(resultCode)  // payment reached final result
SubmitResult.retry(message?)        // let shopper retry

// onAdditionalDetails returns:
AdditionalDetailsResult.completed(resultCode)

// onBeforeSubmit returns one of:
BeforeSubmitResult.proceed(data, sessionData?)  // continue
BeforeSubmitResult.abort()                       // cancel
```

### Interfaces

```typescript
// For modules that handle advanced payment flow responses
interface AdvancedPayment {
  action(action: PaymentAction): void;
  completion(resultCode: string): void;
  retry(message?: string): void;
}
```

---

## Native Bridge State

### Android (`BaseModule.kt`)

```kotlin
companion object {
    @Volatile var checkoutState: CheckoutState? = null
    @Volatile var sdkVersion: String? = null
}

data class CheckoutState(
    val checkoutContext: CheckoutContext,
    val configurationJSON: ReadableMap,  // temporary while DropIn uses v5 config
) {
    val isSession: Boolean get() = checkoutContext is CheckoutContext.Sessions
}
```

### iOS (`BaseModule.swift`)

```swift
static var checkoutState: CheckoutState?
static var sdkVersion: String?
static var presenterStack: [UIViewController] = []

struct CheckoutState {
    let checkoutContext: PaymentCheckout
    var isSession: Bool { checkoutContext is SessionCheckout }
}
```

---

## TS Module Hierarchy

```
EventListenerWrapper<T>           — base event listener
  └─ ModuleWrapper<T>             — adds action/completion/retry (AdvancedPayment)
       └─ DropInWrapper           — DropIn (flat, no intermediate classes)

EventListenerWrapper<T>
  └─ ComponentModuleWrapper       — embedded component native module

ComponentProxy                    — per-view proxy (implements AdvancedPayment)
ContextModuleWrapper              — context/session management (internal)
```

---

## Pending Work

- **`configurationJSON` on Android CheckoutState** — temporary while DropIn relies on v5 `CheckoutConfiguration` builder; remove when DropIn migrates to v6
- **`api-extractor` report** — `etc/api/adyen-react-native.api.md` is stale; regenerate when api-extractor is available
- **Pre-existing typecheck errors** — 2 errors in `ActionHandlingComponentWrapper.ts` (missing `AdyenActionComponent` export from core)
- **Preservation branch** — `preserve/option-a-provider` at commit `36b466ea6` preserves the provider-based API (Option A) if needed for reference
