# Migration Guide: @adyen/react-native 2.12.0 to 3.0.0-alpha.1

## Overview

`@adyen/react-native` 3.0.0-alpha.1 is built on **Adyen iOS SDK 6.0.0-alpha.1** and **Adyen Android SDK 6.0.0-alpha.1**. This is an alpha release intended for early testing and feedback.

The TypeScript/JavaScript public API is **largely backward-compatible**. Most configuration property names (`holderNameRequired`, `addressVisibility`, `showStorePaymentField`, etc.) are unchanged -- native parsers translate the existing property names to the new v6 APIs internally. For most consumers, the TypeScript code changes are **minimal**.

The majority of required changes are in **native project configuration** (iOS deployment target, Kotlin version, redirect handling).

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

### Preserved (No Changes Needed)

The following APIs are fully backward-compatible -- no code changes required:

- All `Configuration` properties (`holderNameRequired`, `addressVisibility`, `showStorePaymentField`, `hideCvcStoredCard`, `hideCvc`, `kcpVisibility`, `socialSecurity`, `supported`, `installmentOptions`, etc.)
- All component types (`AdyenCheckout`, `CardView`, `ApplePayButton`, `GooglePayButton`)
- All module types (`AdyenDropIn`, `AdyenApplePay`, `AdyenGooglePay`, `AdyenInstant`, `AdyenAction`, `AdyenCSE`)
- All event callbacks (`onSubmit`, `onAdditionalDetails`, `onComplete`, `onError`)
- Session flow API (`SessionConfiguration`, `SessionsResult`)
- All payment method types and data structures
- Drop-In configuration (`showPreselectedStoredPaymentMethod`, `skipListWhenSinglePaymentMethod`, `title`)
- Apple Pay and Google Pay configuration
- 3D Secure 2 configuration
- Address lookup callbacks (`onUpdateAddress`, `onConfirmAddress`)
- `useAdyenCheckout` hook

### New Public API: `PaymentResultHandler`

The old `AdyenComponent` and `AdyenActionComponent` interfaces (with `handle()` and `hide()`) have been replaced by a single `PaymentResultHandler` interface:

- **`action(action: ActionData)`** -- Provide an action to the component (e.g., 3DS redirect). Replaces the old `handle(action)`.
- **`completion(resultCode: string)`** -- Signal that the payment is complete with a result code. Replaces the old `hide(true)` / `hide(false)`.
- **`retry(message?: string)`** -- Signal that the payment should be retried, optionally with an error message to display. This is a new concept replacing the error-case `hide(false, { message })` pattern.

All payment modules (`AdyenDropIn`, `AdyenInstant`, `AdyenGooglePay`, `AdyenApplePay`, and embedded `CardView`) now expose `action()`, `completion()`, and `retry()` instead of `handle()` and `hide()`.

The `providePaymentResult()` and `provideAdditionalDetailsResult()` methods have been removed. Use the `action()`, `completion()`, and `retry()` methods directly in your `onSubmit` and `onAdditionalDetails` handlers.

### Currently Unsupported Features (Alpha Limitations)

These features exist in the TypeScript API with `TODO` markers but are **not functional** in this alpha release:

- **Partial payments** -- `provideBalance`, `provideOrder`, `providePaymentMethods`, and `PartialPaymentConfiguration` (`onBalanceCheck`, `onOrderRequest`, `onOrderCancel`) are declared but not wired to native implementations.
- **Stored payment method removal** -- `onDisableStoredPaymentMethod` and `showRemovePaymentMethodButton` in `DropInConfiguration` are declared but not functional.

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

1. **Update the SDK dependency** -- set `@adyen/react-native` to `3.0.0-alpha.1` in `package.json`.
2. **Update iOS deployment target** -- set `platform :ios, '16.0'` in your `Podfile`.
3. **Update Kotlin version** -- set `kotlinVersion = "2.3.21"` in `android/build.gradle` and pin the `kotlin-gradle-plugin` classpath to that version.
4. **Run `pod install`** in your `ios/` directory to fetch the new Adyen 6.0.0-alpha.1 pods.
5. **Update Swift AppDelegate redirect handling** (if not using the Expo plugin) -- change the import to `adyen_react_native` and the call to `ADYRedirectComponent.applicationDidOpen(url)`.
6. **Remove unsupported feature usage** -- if you use partial payments or stored payment method removal, remove or guard that code.
7. **Build and test** on both platforms.

---

## Breaking Changes Summary

| Change | Impact | Action Required |
|--------|--------|----------------|
| iOS minimum deployment target raised to 16.0 | Apps targeting < iOS 16 will fail to build | Update `Podfile` to `platform :ios, '16.0'` |
| Kotlin 2.3.21 required | Android build will fail with older Kotlin | Update `kotlinVersion` in `android/build.gradle` |
| Swift redirect API changed | iOS redirect handling in AppDelegate.swift | Change import to `adyen_react_native` and method to `ADYRedirectComponent.applicationDidOpen(url)` |
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
  The public API is preserved, so type errors are unlikely. If you encounter any, check that you are not referencing internal types that may have changed. The exported types from `@adyen/react-native` remain stable.
