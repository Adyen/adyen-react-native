# Migration Guide: @adyen/react-native 2.12.0 to 3.0.0-alpha.1

## Overview

`@adyen/react-native` 3.0.0-alpha.1 is built on **Adyen iOS SDK 6.0.0-alpha.1** and **Adyen Android SDK 6.0.0-alpha.1**. This is an alpha release intended for early testing and feedback.

The v6 alpha introduces a **new public API** centered around the static `AdyenCheckout` class. Configuration and callbacks are passed to `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`, which return a `Checkout` object. There is no provider component or hook — `AdyenCheckout` is a plain static class, cross-platform aligned with the iOS, Android, and Flutter SDKs.

The majority of required changes are in **native project configuration** (iOS deployment target, Kotlin version, redirect handling) and the **TypeScript integration pattern**.

---

## Platform Requirements

### iOS

- **Minimum deployment target raised to iOS 16.0** (was iOS 12.0).
- Update your `Podfile`:
  ```ruby
  platform :ios, '16.0'
  ```
- Run `pod install` in your `ios/` directory to pick up the new Adyen 6.0.0-alpha.1 pods.

### Android

- **Minimum SDK**: 21 (unchanged; verify your `minSdkVersion >= 21`).
- **Kotlin version**: **2.3.21** required (was 2.0.x/2.1.x).
- Update in your project-level `android/build.gradle`:
  ```groovy
  buildscript {
      ext {
          kotlinVersion = "2.3.21"  // Required for Adyen v6 SDK
      }
      dependencies {
          classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
      }
  }
  ```
- **Important**: If your root `buildscript` has `classpath "org.jetbrains.kotlin:kotlin-gradle-plugin"` without an explicit version, pin it to `$kotlinVersion` to avoid metadata compatibility errors.
- Jetpack Compose dependencies are now included automatically via the SDK. No manual Compose setup is needed.

---

## TypeScript API Changes

### `<AdyenCheckout>` Provider Removed — Static Class API

In v5, `<AdyenCheckout>` was a React component that accepted configuration and callbacks as props. In v6, `AdyenCheckout` is a **static class** — there is no React provider component, no context, and no hooks. Configuration and callbacks are passed directly to `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`:

```tsx
// Before (v5)
<AdyenCheckout
  config={configuration}
  session={session}
  paymentMethods={paymentMethods}
  onSubmit={onSubmit}
  onComplete={onComplete}
  onError={onError}
>
  {children}
</AdyenCheckout>

// After (v6) — no provider, no hook
import { AdyenCheckout } from '@adyen/react-native';

const checkout = await AdyenCheckout.setup(session, configuration, callbacks);
```

#### Session Flow

```tsx
import { AdyenCheckout } from '@adyen/react-native';

const checkout = await AdyenCheckout.setup(
  session,         // SessionConfiguration: { id: string, sessionData: string }
  configuration,   // Configuration object
  {
    onComplete: (result, component) => {
      // Handle session completion
      component.completion(result.resultCode);
    },
    onError: (error, component) => {
      // Handle error
    },
  }
);
```

#### Advanced Flow

```tsx
import { AdyenCheckout } from '@adyen/react-native';

const checkout = await AdyenCheckout.setupAdvanced(
  paymentMethods,   // PaymentMethodsResponse from /paymentMethods API
  configuration,    // Configuration object
  {
    onSubmit: async (data, component) => {
      const result = await apiClient.payments(data);
      if (result.action) {
        component.action(result.action);
      } else {
        component.completion(result.resultCode);
      }
    },
    onAdditionalDetails: async (data, component) => {
      const result = await apiClient.paymentDetails(data);
      component.completion(result.resultCode);
    },
    onError: (error, component) => {
      // Handle error
    },
  }
);
```

### `Checkout` Object

Once `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()` resolves, you receive a `Checkout` object with headless APIs:

```typescript
// Check payment method availability
const available = await checkout.isAvailable('googlepay');

// Check if payment method needs UI
const needsUI = await checkout.requiresUserInteraction('klarna');

// Submit without UI (headless)
checkout.submit('klarna');

// Access payment methods
const methods = checkout.paymentMethods;

// Access configuration and manage subscriptions
checkout.configuration;
checkout.subscribe(...);
checkout.unsubscribe(...);

// Explicit cleanup (automatic on terminal callbacks)
checkout.cleanup();
// Or clean up all checkouts:
AdyenCheckout.cleanup();
```

### Drop-In

Drop-in now uses `AdyenDropIn.start(checkout)` instead of being launched via `start('dropin')`:

```tsx
// Before (v5)
const { start } = useAdyenCheckout();
start('dropin');

// After (v6)
import { AdyenDropIn } from '@adyen/react-native';
AdyenDropIn.start(checkout);
```

### Embedded Components

The new `<AdyenComponent>` replaces `CardView`, `ApplePayButton`, and `GooglePayButton`:

```tsx
// Before (v5)
<CardView />
<ApplePayButton />
<GooglePayButton />

// After (v6)
<AdyenComponent checkout={checkout} type="scheme" />
<AdyenComponent checkout={checkout} type="applepay" />
<AdyenComponent checkout={checkout} type="googlepay" />
```

### `PaymentResultHandler` — Replaces `handle()` / `hide()`

The old `AdyenComponent` and `AdyenActionComponent` interfaces (with `handle()` and `hide()`) have been replaced by a single `PaymentResultHandler` interface:

- **`action(action: ActionData)`** — Provide an action to the component (e.g., 3DS redirect). Replaces the old `handle(action)`.
- **`completion(resultCode: string)`** — Signal that the payment is complete with a result code. Replaces the old `hide(true)` / `hide(false)`.
- **`retry(message?: string)`** — Signal that the payment should be retried, optionally with an error message to display. This is a new concept replacing the error-case `hide(false, { message })` pattern.

### Removed Modules

The following standalone modules have been removed and replaced by the `Checkout` headless APIs:

| Removed Module | Replacement |
|---|---|
| `AdyenGooglePay` | `checkout.isAvailable('googlepay')` + `<AdyenComponent type="googlepay">` |
| `AdyenApplePay` | `checkout.isAvailable('applepay')` + `<AdyenComponent type="applepay">` |
| `AdyenInstant` | `checkout.requiresUserInteraction(type)` + `checkout.submit(type)` |

### Configuration Object

All `Configuration` properties remain unchanged — the same object shape is used, just passed to `AdyenCheckout.setup()`/`AdyenCheckout.setupAdvanced()` instead of the old `<AdyenCheckout>` component props:

- All component-specific configs (`card`, `dropin`, `applepay`, `googlepay`, `threeDS2`, etc.)
- All callback configs (`onUpdateAddress`, `onConfirmAddress`, `onBinValue`, `onBinLookup`, etc.)
- Root configs (`environment`, `clientKey`, `amount`, `countryCode`, `locale`, `returnUrl`)

### Currently Unsupported Features (Alpha Limitations)

These features exist in the TypeScript API with `TODO` markers but are **not functional** in this alpha release:

- **Partial payments** — `provideBalance`, `provideOrder`, `providePaymentMethods`, and `PartialPaymentConfiguration` (`onBalanceCheck`, `onOrderRequest`, `onOrderCancel`) are declared but not wired to native implementations.
- **Stored payment method removal** — `onDisableStoredPaymentMethod` and `showRemovePaymentMethodButton` in `DropInConfiguration` are declared but not functional.

If your app relies on either of these features, remove their usage for now or wait for the GA release.

---

## iOS Integration Changes

### Redirect Handling (AppDelegate)

The redirect handler import and method signature have changed for Swift AppDelegates.

**If you have a Swift AppDelegate:**

```swift
// Before (2.12.0)
import Adyen
// ...
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    RedirectComponent.applicationDidOpen(from: url)
}

// After (3.0.0-alpha.1)
import adyen_react_native
// ...
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    ADYRedirectComponent.applicationDidOpen(url)
}
```

Key changes:
1. Import `adyen_react_native` instead of `import Adyen`.
2. Call `ADYRedirectComponent.applicationDidOpen(url)` instead of `RedirectComponent.applicationDidOpen(from: url)`.

**If you have an Objective-C AppDelegate:**

```objc
// No changes needed -- ADYRedirectComponent is still used
[ADYRedirectComponent applicationDidOpenURL:url];
```

### Expo Plugin

If you use the Expo config plugin (`app.plugin.js` / `withAdyen`), the plugin **automatically handles**:

- The correct Swift import (`import adyen_react_native` instead of `import Adyen`).
- The updated redirect handler call (`ADYRedirectComponent.applicationDidOpen(url)`).

No manual AppDelegate changes are needed when using the Expo plugin.

---

## Android Integration Changes

### Gradle Configuration

Update your project-level `android/build.gradle`:

```groovy
buildscript {
    ext {
        kotlinVersion = "2.3.21"  // Required for Adyen v6 SDK
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}
```

### ProGuard / R8

No new ProGuard rules are needed. The SDK handles minification internally.

---

## Migration Steps

1. **Update the SDK dependency** — set `@adyen/react-native` to `3.0.0-alpha.1` in `package.json`.
2. **Update iOS deployment target** — set `platform :ios, '16.0'` in your `Podfile`.
3. **Update Kotlin version** — set `kotlinVersion = "2.3.21"` in `android/build.gradle` and pin the `kotlin-gradle-plugin` classpath to that version.
4. **Run `pod install`** in your `ios/` directory to fetch the new Adyen 6.0.0-alpha.1 pods.
5. **Update Swift AppDelegate redirect handling** (if not using the Expo plugin) — change the import to `adyen_react_native` and the call to `ADYRedirectComponent.applicationDidOpen(url)`.
6. **Replace `<AdyenCheckout>` provider and `useAdyenCheckout()` hook** — remove the provider component and hook calls entirely; use `AdyenCheckout.setup()` / `AdyenCheckout.setupAdvanced()` static methods instead.
7. **Replace `start('type')` with the new API** — use `AdyenDropIn.start(checkout)` for Drop-In, and `<AdyenComponent checkout={checkout} type="..." />` for embedded components.
8. **Replace `handle()`/`hide()` with `action()`/`completion()`/`retry()`** in your payment result handling.
9. **Replace per-method modules** — remove `AdyenGooglePay`, `AdyenApplePay`, `AdyenInstant` usage; use `Checkout` headless APIs instead.
10. **Remove unsupported feature usage** — if you use partial payments or stored payment method removal, remove or guard that code.
11. **Build and test** on both platforms.

---

## Complete Example: Session Flow

```tsx
import { AdyenCheckout, AdyenDropIn } from '@adyen/react-native';
import type { SessionConfiguration, Configuration, SessionCallbacks } from '@adyen/react-native';

const config: Configuration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 9800 },
  returnUrl: 'myapp://adyencheckout',
};

const callbacks: SessionCallbacks = {
  onComplete: (result, component) => {
    component.completion(result.resultCode);
  },
  onError: (error, component) => {
    console.error(error);
  },
};

const App = () => {
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    AdyenCheckout.setup(session, config, callbacks).then(setCheckout);
  }, []);

  if (!checkout) return <ActivityIndicator />;

  return <Button title="Drop-in" onPress={() => AdyenDropIn.start(checkout)} />;
};
```

## Complete Example: Advanced Flow

```tsx
import { AdyenCheckout, AdyenComponent } from '@adyen/react-native';
import type { Configuration, AdvancedCallbacks, PaymentMethodsResponse } from '@adyen/react-native';

const config: Configuration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 9800 },
  returnUrl: 'myapp://adyencheckout',
};

const callbacks: AdvancedCallbacks = {
  onSubmit: async (data, component) => {
    const result = await myApiClient.payments(data);
    if (result.action) {
      component.action(result.action);
    } else {
      component.completion(result.resultCode);
    }
  },
  onAdditionalDetails: async (data, component) => {
    const result = await myApiClient.paymentDetails(data);
    component.completion(result.resultCode);
  },
  onError: (error, component) => {
    console.error(error);
  },
};

const App = () => {
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    AdyenCheckout.setupAdvanced(paymentMethods, config, callbacks).then(setCheckout);
  }, []);

  if (!checkout) return <ActivityIndicator />;

  return <AdyenComponent checkout={checkout} type="scheme" />;
};
```

---

## Breaking Changes Summary

| Change | Impact | Action Required |
|--------|--------|----------------|
| iOS minimum deployment target raised to 16.0 | Apps targeting < iOS 16 will fail to build | Update `Podfile` to `platform :ios, '16.0'` |
| Kotlin 2.3.21 required | Android build will fail with older Kotlin | Update `kotlinVersion` in `android/build.gradle` |
| Swift redirect API changed | iOS redirect handling in AppDelegate.swift | Change import to `adyen_react_native` and method to `ADYRedirectComponent.applicationDidOpen(url)` |
| `<AdyenCheckout>` provider and `useAdyenCheckout()` hook removed | `AdyenCheckout` is now a static class | Use `AdyenCheckout.setup()` / `AdyenCheckout.setupAdvanced()` |
| `start('type')` removed | Drop-in and component launch changed | Use `AdyenDropIn.start(checkout)` and `<AdyenComponent>` |
| `handle()`/`hide()` removed | Payment result handling changed | Use `action()`/`completion()`/`retry()` |
| `AdyenGooglePay`, `AdyenApplePay`, `AdyenInstant` removed | Per-method modules gone | Use `Checkout` headless APIs |
| `CardView`, `ApplePayButton`, `GooglePayButton` removed | Per-method views gone | Use `<AdyenComponent checkout={checkout} type="...">` |
| Partial payments not functional | Apps using partial payment flow | Remove usage or wait for GA release |
| Stored payment method removal not functional | Apps using stored payment removal UI | Remove usage or wait for GA release |

---

## Troubleshooting

### Android

- **"Module was compiled with incompatible Kotlin metadata"**
  Bump Kotlin to `2.3.21` in your project-level `build.gradle` **and** ensure the `kotlin-gradle-plugin` classpath is pinned to the same version.

### iOS

- **"Cannot find type 'Payment'" or missing Adyen symbols**
  Run `pod install` to fetch the Adyen 6.0.0-alpha.1 pods. If you have a `Podfile.lock` from a previous version, delete it first and re-run `pod install`.

- **"RedirectComponent is not accessible" or "Cannot find 'RedirectComponent' in scope"**
  Update your AppDelegate to use `ADYRedirectComponent.applicationDidOpen(url)` with `import adyen_react_native`. The old `import Adyen` / `RedirectComponent.applicationDidOpen(from:)` pattern is no longer available.

- **iOS build fails with deployment target errors**
  Ensure your `Podfile` has `platform :ios, '16.0'`. Also check that no other pod or post-install script overrides the deployment target to a lower value.

### General

- **TypeScript type errors after upgrade**
  Check that you have removed the `<AdyenCheckout>` provider component and `useAdyenCheckout()` hook, and replaced them with `AdyenCheckout.setup()` / `AdyenCheckout.setupAdvanced()` static method calls. Verify that `handle()` / `hide()` calls have been replaced with `action()` / `completion()` / `retry()`.
