# Migration guide

This is the current, authoritative migration guide for external consumers of `@adyen/react-native`.
It describes how to move an app from the **v5 provider-and-hook generation** (the `<AdyenCheckout>`
React provider, the `useAdyenCheckout()` hook, and the per-method views and modules) to the
**v6-alpha static-`AdyenCheckout` generation** shipped at this repository revision.

For behavior details this guide defers to the canonical documents rather than restating them:

| Concern                                   | Canonical authority                          |
| ----------------------------------------- | -------------------------------------------- |
| Checkout lifecycle and system overview    | [Architecture.md](./Architecture.md)         |
| Platform/flow/presenter capability status | [FeatureSupport.md](./FeatureSupport.md)     |
| Chronological session/advanced/etc. flows | [public-api-flows.md](./public-api-flows.md) |
| Configuration option shapes               | [Configuration.md](./Configuration.md)       |
| Version and toolchain compatibility       | [Compatibility.md](./Compatibility.md)       |

Historical proposals and the native bridge rewrite notes are in [archive/](./archive/README.md).
They are not authoritative and must not be used as integration steps.

## Release provenance

> [!IMPORTANT]
> This is an **alpha** generation. Treat it as early-access and expect further breaking changes.

- **Source generation:** the v5 provider-and-hook API of `@adyen/react-native`.
- **Target generation:** the v6-alpha static-`AdyenCheckout` API at this repository revision.
- **Package version:** `package.json` in this repository reads `2.0.0-local.1`. That is a local
  development version, **not** a published install target — do not add
  `@adyen/react-native@2.0.0-local.1` to your app. Install the v6 alpha from the release channel you
  were given, and pin to the exact published version shown in that release's metadata.
- **Native SDK version (library-owned):** this generation builds on the Adyen native iOS and Android
  SDK `6.0.0-alpha.1`, declared in `package.json` under `adyen.ios` / `adyen.android`. This is a
  library-owned value; you do not set it in your app.

## Migration at a glance

1. [Check compatibility and prepare](#1-check-compatibility-and-prepare).
2. [Update the package and your native projects](#2-update-the-package-and-your-native-projects).
3. [Update the TypeScript public API and configuration](#3-update-the-typescript-public-api-and-configuration).
4. [Review current flow and platform limitations](#4-review-current-flow-and-platform-limitations).
5. [Validate the migration](#5-validate-the-migration).

## 1. Check compatibility and prepare

Confirm your app meets the consumer-owned requirements below. Detailed version rules live in
[Compatibility.md](./Compatibility.md); library-owned versions are listed separately in
[Release provenance](#release-provenance).

**Consumer-owned (you change these):**

- **React Native `>=0.76.0`** — the peer requirement declared in `package.json`.
- **Expo `>=52`** (optional) — only if you use the Expo config plugin (`peerDependencies.expo`).
- **iOS deployment target `16.0`** — required by the vendored Adyen iOS frameworks
  (`adyen-react-native.podspec` declares `s.platform = :ios, "16.0"`).
- **Android root-project Kotlin compatible with `2.3.21`** — the version this library builds against
  (`android/gradle.properties` `ReactNative_kotlinVersion=2.3.21`).
- **Redirect / deep-link handling** — see
  [Update your native projects](#update-your-native-projects).

**Library-owned (do not set or pin these in your app):**

- The Adyen native SDK version (`6.0.0-alpha.1`).
- Jetpack Compose and the Compose BOM — the library applies the Kotlin Compose plugin and pulls in
  Compose itself (`android/build.gradle`, `android/dependencies.gradle`).
- Android `compileSdk` / `targetSdk` fallbacks (`36`) and the min SDK fallback (`21`) declared by the
  library (`android/gradle.properties`).
- iOS transitive pods vendored by the library (`AdyenNetworking`, `Adyen3DS2`).

## 2. Update the package and your native projects

### Update the package

- Update your app's dependency on `@adyen/react-native` to the v6 alpha release and reinstall with
  your existing package manager and lockfile. Do not hand-edit or delete lockfiles, and do not modify
  files inside `node_modules`.

### Update your native projects

These are the consumer-owned native integration changes.

**iOS**

1. Set the deployment target in your `ios/Podfile`:
   ```ruby
   platform :ios, '16.0'
   ```
2. Run `pod install` in your `ios/` directory to pick up the updated pods.
3. Forward custom-URL-scheme redirect returns from your AppDelegate. The redirect entry point is
   `ADYRedirectComponent`, exposed by this library (`ios/ADYRedirectComponent.h`). A bare React
   Native AppDelegate conforms directly to `UIResponder, UIApplicationDelegate` (as the example app's
   `example/ios/AppDelegate.swift` does), which has **no** inherited `application(_:open:options:)` to
   call through `super`, so forward any URL the Adyen component does not consume to
   `RCTLinkingManager` (`import React`) instead:
   ```swift
   // Swift AppDelegate (bare React Native: `AppDelegate: UIResponder, UIApplicationDelegate`)
   import adyen_react_native
   import React

   func application(_ app: UIApplication, open url: URL,
                    options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
     if ADYRedirectComponent.applicationDidOpen(url) {
       return true
     }
     return RCTLinkingManager.application(app, open: url, options: options)
   }
   ```
   If instead your AppDelegate subclasses `RCTAppDelegate`/`ExpoAppDelegate` (which do implement this
   method), mark it `override` and chain to `super.application(app, open: url, options: options)`
   rather than calling `RCTLinkingManager` directly.
   ```objectivec
   // Objective-C AppDelegate
   #import <adyen_react_native/ADYRedirectComponent.h>

   - (BOOL)application:(UIApplication *)application openURL:(NSURL *)url
              options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
     return [ADYRedirectComponent applicationDidOpenURL:url];
   }
   ```
4. Forward universal-link redirect returns as well. Redirect payment methods that return over an
   HTTPS universal link arrive through `application(_:continue:restorationHandler:)`, so you must
   hand its `webpageURL` to the same `ADYRedirectComponent` entry point in addition to the
   custom-scheme handler above:
   ```swift
   // Swift AppDelegate (bare React Native: `AppDelegate: UIResponder, UIApplicationDelegate`)
   import React

   func application(_ application: UIApplication,
                    continue userActivity: NSUserActivity,
                    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
     if let url = userActivity.webpageURL, ADYRedirectComponent.applicationDidOpen(url) {
       return true
     }
     return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
   }
   ```
   A bare `UIResponder, UIApplicationDelegate` has no inherited
   `application(_:continue:restorationHandler:)` to call through `super`, so forward the unclaimed
   activity to `RCTLinkingManager` as above. If your AppDelegate subclasses
   `RCTAppDelegate`/`ExpoAppDelegate` (which implement this method), mark it `override` and chain to
   `super.application(application, continue: userActivity, restorationHandler: restorationHandler)`
   instead — this is exactly what the Expo config plugin generates.
   ```objectivec
   // Objective-C AppDelegate
   - (BOOL)application:(UIApplication *)application
       continueUserActivity:(NSUserActivity *)userActivity
         restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *))restorationHandler {
     if ([userActivity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb]) {
       NSURL *url = userActivity.webpageURL;
       if (url && [ADYRedirectComponent applicationDidOpenURL:url]) {
         return YES;
       }
     }
     return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
   }
   ```

> [!TIP]
> If you use the Expo config plugin (`withAdyen`), the plugin rewrites the AppDelegate import and
> both the open-URL and universal-link (`continue userActivity`) forwarding for you
> (`src/plugin/withAdyenIos.ts`, `src/plugin/setApplicationOpenUrlSwift.ts`,
> `src/plugin/setApplicationContinueUserActivitySwift.ts`), so you can skip the manual AppDelegate
> edits.

**Android**

1. Ensure your Android root project's Kotlin toolchain is compatible with `2.3.21` (the version this
   library builds against). Set it in your own root `android/build.gradle` — for example an
   `ext.kotlinVersion` your buildscript already uses — rather than editing anything under
   `node_modules`. Do not pin the Adyen SDK or Compose versions yourself; those are library-owned.
2. Register your launcher activity with the library in its `onCreate`, using
   `AdyenCheckout.setLauncherActivity(this)` (`android/.../AdyenCheckout.kt`). This is **required for
   Android Drop-in**: `setLauncherActivity` only delegates to `DropInModule.register(activity)`, so it
   registers the presentation host that the Drop-in launcher needs. It is **not** required for
   `<AdyenComponent>` or headless components — the embedded view obtains its `FragmentActivity`
   directly from `ThemedReactContext.currentActivity` and never consults the Drop-in registration.
   ```kotlin
   override fun onCreate(savedInstanceState: Bundle?) {
     super.onCreate(savedInstanceState)
     AdyenCheckout.setLauncherActivity(this)
   }
   ```
3. Forward redirect intents to the library from that launcher activity's `onNewIntent`, using the
   `AdyenCheckout.handleIntent(intent)` entry point (`android/.../AdyenCheckout.kt`):
   ```kotlin
   override fun onNewIntent(intent: Intent) {
     super.onNewIntent(intent)
     AdyenCheckout.handleIntent(intent)
   }
   ```
4. Register an `intent-filter` for your redirect URL scheme on that activity in
   `AndroidManifest.xml`, as with any Android deep link.

> [!TIP]
> If you use the Expo config plugin (`withAdyen`), the plugin edits your `MainActivity` for you,
> inserting both `AdyenCheckout.setLauncherActivity(this)` in `onCreate` and
> `AdyenCheckout.handleIntent(...)` in `onNewIntent` (`src/plugin/withAdyenAndroid.ts`,
> `src/plugin/setKotlinMainActivity.ts`, `src/plugin/setJavaMainActivity.ts`), so you can skip
> steps 2 and 3.

## 3. Update the TypeScript public API and configuration

The public surface changed from a React provider plus hooks to a static `AdyenCheckout` class that
returns a per-call `Checkout` handle. All names below are from the generated public API report
(`etc/api/adyen-react-native.api.md`). For the full lifecycle contract see
[Architecture.md](./Architecture.md).

### Provider and hooks → `AdyenCheckout.setup()` / `setupAdvanced()`

The `<AdyenCheckout>` provider component and the `useAdyenCheckout()` hook are removed. Configuration
and callbacks are passed directly to the static setup methods, which resolve to a `Checkout` handle.

```tsx
// Before (v5): provider + hook
<AdyenCheckout
  config={configuration}
  session={session}
  onSubmit={onSubmit}
  onComplete={onComplete}
>
  {children}
</AdyenCheckout>;
// ...and inside a child:
const { start } = useAdyenCheckout();

// After (v6): static class, no provider, no hook
import { AdyenCheckout, BeforeSubmitResult } from '@adyen/react-native';

// Session flow
const checkout = await AdyenCheckout.setup(session, configuration, {
  onComplete(result) {
    /* terminal */
  },
  onError(error) {
    /* terminal */
  },
  async onBeforeSubmit(data) {
    return BeforeSubmitResult.proceed(data); // optional
  },
});

// Advanced flow
const checkout = await AdyenCheckout.setupAdvanced(
  paymentMethods,
  configuration,
  advancedCallbacks
);
```

`AdyenCheckout` has no public constructor and holds the single active checkout as process-wide state.
Always `await` one setup before starting another; overlapping setup calls are unsupported (see
[Architecture.md](./Architecture.md)).

### Per-method views and modules → `<AdyenComponent>` and `Checkout` headless methods

The per-method views (`CardView`, `ApplePayButton`, `GooglePayButton`) and per-method modules
(`AdyenGooglePay`, `AdyenApplePay`, `AdyenInstant`) are removed. Use the single embedded
`<AdyenComponent>` for any payment-method type, and the `Checkout` handle's headless methods for
availability and no-UI submits.

```tsx
// Before (v5)
<CardView />
<ApplePayButton />
<GooglePayButton />
// availability + headless via per-method modules (AdyenGooglePay/AdyenApplePay/AdyenInstant)

// After (v6): one embedded view for any type
<AdyenComponent checkout={checkout} type="scheme" />
<AdyenComponent checkout={checkout} type="applepay" />
<AdyenComponent checkout={checkout} type="googlepay" />
```

```typescript
// After (v6): headless methods on the Checkout handle
const available = await checkout.isAvailable('googlepay');
const needsUI = await checkout.requiresUserInteraction('klarna');
if (!needsUI) checkout.submit('klarna'); // no-UI submit
```

Only one `<AdyenComponent>` of a given `type` can be mounted at a time; different types can be mounted
together. Wallet and BIN-callback support differs by platform — see
[FeatureSupport.md](./FeatureSupport.md).

### Handler-object responses → `SubmitResult` and `AdditionalDetailsResult`

Advanced-flow callbacks no longer receive a handler object to call back into. Instead `onSubmit`
returns a `Promise<SubmitResult>` and `onAdditionalDetails` returns a
`Promise<AdditionalDetailsResult>`.

```tsx
// Before (v5): handler object
onSubmit: (data, component) => {
  const res = await api.payments(data);
  if (res.action) component.action(res.action);
  else component.completion(res.resultCode);
};

// After (v6): return a result
import { SubmitResult, AdditionalDetailsResult } from '@adyen/react-native';

const advancedCallbacks = {
  async onSubmit(data) {
    const res = await api.payments(data);
    if (res.action) return SubmitResult.action(res.action);
    return SubmitResult.completed(res.resultCode);
    // or SubmitResult.retry(message) to let the shopper retry
  },
  async onAdditionalDetails(data) {
    const res = await api.paymentDetails(data);
    return AdditionalDetailsResult.completed(res.resultCode);
  },
  onComplete(result) {
    /* terminal */
  },
  onError(error) {
    /* terminal */
  },
};
```

Session flow uses `SessionCallbacks` (`onComplete`, `onError`, optional `onBeforeSubmit` returning a
`BeforeSubmitResult`); the SDK owns `/payments` and `/payments/details` internally. Advanced flow uses
`AdvancedCallbacks` and you own the `/payments` and `/payments/details` calls. The exact suspension,
continuation, and terminal ordering is in [public-api-flows.md](./public-api-flows.md).

### Abandoned-flow cleanup → `checkout.invalidate()`

There is no public `cleanup()` method. Terminal callbacks (`onComplete` / `onError`) trigger cleanup
automatically. For a flow the shopper abandons **without** a terminal callback (for example they
navigate away), call `checkout.invalidate()`. It is idempotent.

```typescript
// e.g. on screen unmount for a flow that never completed
useEffect(() => () => checkout?.invalidate(), [checkout]);
```

### Configuration

The `Configuration` object shape is largely unchanged; it is now passed to `AdyenCheckout.setup()` /
`setupAdvanced()` instead of provider props. Note that `Configuration.returnUrl` is required. For the
exact option, callback, enum, and default shapes, see [Configuration.md](./Configuration.md). Do not
infer runtime support from a configuration key alone — consult
[FeatureSupport.md](./FeatureSupport.md).

## 4. Review current flow and platform limitations

This generation has capability gaps that change how you migrate. The authoritative status per
platform, flow, and presenter is in [FeatureSupport.md](./FeatureSupport.md); the summary below only
flags migration-impacting items and links there.

### Changed Drop-in launch behavior

Drop-in is launched with `AdyenDropIn.start(checkout)` (using the `Checkout` handle from setup)
instead of the v5 `start('dropin')`.

```tsx
// Before (v5)
const { start } = useAdyenCheckout();
start('dropin');

// After (v6)
import { AdyenDropIn } from '@adyen/react-native';
AdyenDropIn.start(checkout);
```

> [!WARNING]
> Drop-in support is limited in this generation. See [FeatureSupport.md](./FeatureSupport.md) for the
> authoritative status:
>
> - **iOS Drop-in** is **unsupported** — `start` returns `notSupported` and never presents.
> - **Android session Drop-in** is **unsupported** — it emits an explicit v6-alpha error and never
>   presents.
> - **Android advanced Drop-in** is **legacy-backed** only, through the pre-v6 implementation, with
>   the limitations noted in [FeatureSupport.md](./FeatureSupport.md).
>
> If Drop-in is central to your app, prefer the embedded `<AdyenComponent>` or headless
> `checkout.submit()` presenters on the platforms and flows marked supported there.

### Other capability gaps

Partial payments, stored-payment-method removal, address lookup, and BIN callbacks are partially or
not wired, and wallet availability is platform-specific. Remove or guard any code that depends on a
capability marked `unsupported`, `legacy-backed`, or `declared-only / nonfunctional` in
[FeatureSupport.md](./FeatureSupport.md). Do not rely on a declared TypeScript prop or configuration
key as proof of runtime support.

## 5. Validate the migration

After migrating, verify each of the following:

- **TypeScript compilation** — your app type-checks against the new public API (`AdyenCheckout`,
  `Checkout`, `SubmitResult`, `AdditionalDetailsResult`, `BeforeSubmitResult`) with no references to
  the removed provider, hook, per-method views, or per-method modules.
- **iOS build** — the app builds after `pod install` with `platform :ios, '16.0'`.
- **Android build** — the app builds with a Kotlin toolchain compatible with `2.3.21`.
- **Redirect / action return handling** — a redirect payment method returns to your app and resolves
  over both a custom URL scheme and an HTTPS universal link (iOS
  `ADYRedirectComponent.applicationDidOpen` from `open url` and `continue userActivity`; Android
  `AdyenCheckout.setLauncherActivity` in `onCreate` plus `AdyenCheckout.handleIntent` from
  `onNewIntent`), and 3DS2 / action results flow back through `onAdditionalDetails`.
- **Every presenter and flow you use** — embedded `<AdyenComponent>`, headless `checkout.submit()`,
  Drop-in where supported, and standalone `AdyenAction`, on each platform and flow marked supported in
  [FeatureSupport.md](./FeatureSupport.md).
- **Terminal callbacks** — `onComplete` and `onError` fire exactly once and your app tears down
  correctly after them.
- **Abandoned-flow invalidation** — abandoning a flow and calling `checkout.invalidate()` leaves no
  active checkout, and calling it again is a safe no-op.

## Do not

To keep the migration safe and reproducible, do not:

- delete `yarn.lock`, `package-lock.json`, `Podfile.lock`, or any other lockfile;
- edit files inside `node_modules`;
- manually pin the library-owned native dependencies (Adyen SDK, Compose, `compileSdk`, or transitive
  pods) in your app;
- copy internals from the archived native [bridge guides](./archive/README.md) into your app as
  integration steps — they are historical and describe library internals, not your integration.
