[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v6.0.0--alpha.1-orange.svg)](https://github.com/Adyen/adyen-ios/releases/tag/6.0.0-alpha.1)
[![Adyen Android](https://img.shields.io/badge/android-v6.0.0--alpha.1-orange.svg)](https://github.com/Adyen/adyen-android/releases/tag/6.0.0-alpha.1)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Adyen_adyen-react-native&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Adyen_adyen-react-native)

> [!CAUTION]
> **This is the v6 alpha of the Adyen React Native SDK.**
>
> This release migrates the React Native SDK to the Adyen v6 native SDKs with a redesigned TypeScript API. It is not yet suitable for production use.
>
> **Key changes from v5:**
> - `AdyenCheckout` is a static class (no provider component or hooks)
> - `AdyenCheckout.setup()` / `AdyenCheckout.setupAdvanced()` return a `Checkout` object with headless APIs
> - Generic `<AdyenComponent>` replaces per-method views (`<CardView>`, `<GooglePayButton>`, `<ApplePayButton>`)
> - `AdyenDropIn.start(checkout)` replaces `open()`
> - Return-based callbacks: `onSubmit` returns `SubmitResult`, `onAdditionalDetails` returns `AdditionalDetailsResult`
> - Auto-cleanup on terminal callbacks
> - Cross-platform aligned with iOS, Android, and Flutter SDK setup pattern
>
> **Known alpha limitations:**
> - Partial payments are not yet supported
> - Stored payment method removal is not yet supported
>
> **Platform requirements:**
> - React Native 0.85+
> - iOS 16.0+
> - Adyen iOS SDK 6.0.0-alpha.1
> - Adyen Android SDK 6.0.0-alpha.1
> - Kotlin 2.3.21+
> - TypeScript ^6.0.3

![React Native Logo](https://user-images.githubusercontent.com/2648655/198584674-f0c46e71-1c21-409f-857e-77acaa4daae0.png)

# Adyen React Native (v6 Alpha)

Adyen React Native provides you with the building blocks to create a checkout experience for your shoppers, allowing them to pay using the payment method of their choice.

You can integrate with Adyen React Native in two ways:

- **[Drop-in][adyen-docs-dropin]**: An all-in-one payment modal — the quickest way to accept payments on your React Native app.
- **[Components][adyen-docs-components]**: Embedded payment views rendered inline via the generic `<AdyenComponent>` — one component per payment method that can be combined with your own payments flow.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Expo](#expo-integration)
  - [Manual Integration](#manual-integration)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Sessions Flow](#sessions-flow)
  - [Advanced Flow](#advanced-flow)
  - [Drop-in](#drop-in)
  - [Embedded Components](#embedded-components)
  - [Headless APIs](#headless-apis)
- [Build & Test](#build--test)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Prerequisites

- [Adyen test account](https://www.adyen.com/signup)
- [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key)
- [Client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key)

# Installation

Add `@adyen/react-native` to your React Native project:

```bash
yarn add @adyen/react-native
```

## Expo Integration

> [!IMPORTANT]
>
> This library is not compatible with Expo Go. It is designed exclusively for use with [Continuous Native Generation](https://docs.expo.dev/workflow/overview/#continuous-native-generation-cng).

Add `@adyen/react-native` plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": ["@adyen/react-native"]
  }
}
```

<details>
<summary><strong>Plugin Configuration Options</strong></summary>

| Option               | Description                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| `merchantIdentifier` | Sets ApplePay Merchant ID to your iOS app's entitlement file. Empty by default. |
| `useFrameworks`      | Adjust `import` on iOS in case your `Podfile` has `use_frameworks!` enabled.    |

**Example with all options:**

```json
{
  "expo": {
    "plugins": [
      [
        "@adyen/react-native",
        {
          "merchantIdentifier": "merchant.com.my-merchant-id",
          "useFrameworks": true
        }
      ]
    ]
  }
}
```

</details>

> [!TIP]
>
> If you are facing issues with the plugin, pre-build your app and investigate the generated files:
>
> ```bash
> npx expo prebuild --clean
> ```

## Manual Integration

<details>
<summary><strong>iOS Setup</strong></summary>

1. Run `pod install`

2. Add `returnURL` handler to your `AppDelegate.swift`:

```swift
import adyen_react_native

// ...

func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return ADYRedirectComponent.applicationDidOpen(url)
}
```

If using `RCTLinkingManager` or other deep-linking techniques, place `ADYRedirectComponent.applicationDidOpen` before them:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return ADYRedirectComponent.applicationDidOpen(url) || RCTLinkingManager.application(app, open: url, options: options)
}
```

For Universal Link support:

```swift
func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL,
       ADYRedirectComponent.applicationDidOpen(url) {
        return true
    }
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
}
```

3. Add [custom URL Scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) to your app.

4. **For ApplePay:** Follow the [Enable ApplePay for iOS](https://docs.adyen.com/payment-methods/apple-pay/enable-apple-pay?tab=i_os_2) guide.

</details>

<details>
<summary><strong>Android Setup</strong></summary>

1. Provide your Checkout activity to `AdyenCheckout` in `MainActivity.kt`:

```kotlin
import com.adyenreactnativesdk.AdyenCheckout
import android.os.Bundle

// ...

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    AdyenCheckout.setLauncherActivity(this)
}
```

2. Add `intent-filter` to your Checkout activity (for standalone components):

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:path="/payment" />
</intent-filter>
```

3. Add `returnURL` handler for standalone redirect components in `MainActivity.kt`:

```kotlin
import android.content.Intent

// ...

override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    AdyenCheckout.handleIntent(intent)
}
```

4. Ensure your app theme extends `Theme.MaterialComponents`:

```xml
<style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
    <!-- Your configuration here -->
</style>
```

</details>

# Usage

For general understanding of how prebuilt UI components of Adyen work you can follow [our documentation](https://docs.adyen.com/online-payments/prebuilt-ui).

## Configuration

All payment flows start by creating a configuration object and passing it to `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`:

```typescript
import { AdyenCheckout, type Configuration } from '@adyen/react-native';

const configuration: Configuration = {
  environment: 'test', // Change to a live environment when ready for production
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 }, // Value in minor units
};

// Session flow:
const checkout = await AdyenCheckout.setup(session, configuration, callbacks);

// Advanced flow:
const checkout = await AdyenCheckout.setupAdvanced(paymentMethods, configuration, callbacks);
```

To read more about other configuration options, see the [full list][configuration].

## Sessions Flow

The sessions flow lets the Adyen backend manage the payment lifecycle. Call `AdyenCheckout.setup()` with your session credentials, configuration, and callbacks:

```typescript
import { AdyenCheckout, AdyenDropIn, type Checkout } from '@adyen/react-native';
import { useCallback, useState } from 'react';

const [checkout, setCheckout] = useState<Checkout | null>(null);

const onComplete = useCallback((result) => {
  // The session reached a final result.
  // Call /sessions/{sessionId}?sessionResult={result.sessionResult}
  // to get more information about the payment outcome.
}, []);

const onError = useCallback((error) => {
  // The payment was terminated by the shopper or encountered an error.
}, []);

const newCheckout = await AdyenCheckout.setup(
  { id: '{SESSION_ID}', sessionData: '{SESSION_DATA}' },
  configuration,
  {
    onComplete,
    onError
  }
);

setCheckout(newCheckout);

// Launch Drop-in with the checkout object
AdyenDropIn.start(checkout);
```

## Advanced Flow

The advanced flow gives you full control over the `/payments` and `/payments/details` calls. Call `AdyenCheckout.setupAdvanced()` with your payment methods response, configuration, and callbacks:

```typescript
import {
  AdyenCheckout,
  AdyenDropIn,
  SubmitResult,
  type Checkout,
} from '@adyen/react-native';
import { useCallback, useState } from 'react';

const [checkout, setCheckout] = useState<Checkout | null>(null);

const onSubmit = useCallback(async (data) => {
  // Call your server to make the /payments request.
  // Pass returnUrl: data.returnUrl for redirect flows.
  const response = await server.makePayment(data);
  if (response.action) {
    return SubmitResult.action(response.action);
  } else if (response.resultCode === 'Refused') {
    return SubmitResult.retry(response.refusalReason);
  } else {
    return SubmitResult.completed(response.resultCode);
  }
}, []);

const onAdditionalDetails = useCallback(async (data) => {
  // Call your server to make the /payments/details request.
  const response = await server.paymentDetails(data);
  return { resultCode: response.resultCode };
}, []);

const onComplete = useCallback((result) => {
  // The payment flow completed.
}, []);

const onError = useCallback((error) => {
  // The payment was terminated by the shopper or encountered an error.
}, []);

const newCheckout = await AdyenCheckout.setupAdvanced(
  paymentMethodsResponse,
  configuration,
  {
    onSubmit,
    onAdditionalDetails,
    onComplete,
    onError
  }
);

setCheckout(newCheckout);

// Launch Drop-in with the checkout object
AdyenDropIn.start(checkout);
```

### Callback Return Types

The v6 API uses return-based callbacks instead of handler objects:

| Callback | Return type | Description |
| --- | --- | --- |
| `onSubmit` | `Promise<SubmitResult>` | Return `SubmitResult.action()`, `.completed()`, or `.retry()` |
| `onAdditionalDetails` | `Promise<AdditionalDetailsResult>` | Return `{ resultCode: string }` |
| `onComplete` | `void` | Terminal — no return needed |
| `onError` | `void` | Terminal — no return needed |

## Drop-in

Drop-in shows all available payment methods in a modal and handles the full payment lifecycle. After obtaining a `checkout` from `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`, launch it with:

```typescript
import { AdyenDropIn } from '@adyen/react-native';

// After setup resolves:
AdyenDropIn.start(checkout);
```

## Embedded Components

For rendering individual payment methods inline, use the generic `<AdyenComponent>`. It replaces the former per-method views (`<CardView>`, `<GooglePayButton>`, `<ApplePayButton>`):

```tsx
import { AdyenComponent } from '@adyen/react-native';

function CardPayment({ checkout }) {
  return <AdyenComponent checkout={checkout} type="scheme" />;
}

function GooglePayPayment({ checkout }) {
  return <AdyenComponent checkout={checkout} type="googlepay" />;
}

function ApplePayPayment({ checkout }) {
  return <AdyenComponent checkout={checkout} type="applepay" />;
}
```

> [!NOTE]
>
> Only one `<AdyenComponent>` per payment method `type` may be mounted at a time.

## Headless APIs

The `Checkout` object returned by `AdyenCheckout.setup()` / `AdyenCheckout.setupAdvanced()` exposes headless APIs for programmatic payment flows:

```typescript
const checkout = await AdyenCheckout.setup(session, configuration, callbacks);

// List available payment methods
console.log(checkout.paymentMethods);

// Check if a payment method is available for the shopper
const available = await checkout.isAvailable('googlepay');

// Check if the payment method needs UI before submission
const needsUI = await checkout.requiresUserInteraction('klarna');

// Submit a payment method without displaying UI
if (!needsUI) {
  checkout.submit('klarna');
}
```

## Standalone Action Handling

For API-only integrations, `AdyenAction.handle` can process payment actions without a full checkout context:

```typescript
import { AdyenAction } from '@adyen/react-native';

const data = await AdyenAction.handle(apiResponse.action, {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
});
const result = await ApiClient.paymentDetails(data);
```

# Documentation

- [Configuration][configuration]
- [Localization][localization]
- [UI Customization][customization]
- [Error codes](/docs/Error%20codes.md)
- [Drop-in documentation][adyen-docs-dropin]
- [Component documentation][adyen-docs-components]

## Contributing

We strongly encourage you to join us in contributing to this repository so everyone can benefit from:
- New features and functionality
- Resolved bug fixes and issues
- Any general improvements

Read our [**contribution guidelines**](CONTRIBUTING.md) to find out how.

# Support

If you have a feature request, or spotted a bug or a technical problem, [create a GitHub issue](https://github.com/Adyen/adyen-react-native/issues/new/choose). For other questions, contact our Support Team via [Customer Area](https://ca-live.adyen.com/ca/ca/contactUs/support.shtml) or via email: support@adyen.com

# License

MIT license. For more information, see the [LICENSE](LICENSE) file.

[client.key]: https://docs.adyen.com/online-payments/android/drop-in#client-key
[configuration]: /docs/Configuration.md
[localization]: /docs/Localization.md
[customization]: /docs/Customization.md
[adyen-docs-dropin]: https://docs.adyen.com/online-payments/react-native/drop-in
[adyen-docs-components]: https://docs.adyen.com/online-payments/react-native/components
