[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v6.0.0--alpha.1-brightgreen.svg)](https://github.com/Adyen/adyen-ios/releases/tag/6.0.0-alpha.1)
[![Adyen Android](https://img.shields.io/badge/android-v6.0.0--alpha.1-brightgreen.svg)](https://github.com/Adyen/adyen-android/releases/tag/6.0.0-alpha.1)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Adyen_adyen-react-native&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Adyen_adyen-react-native)

> [!Important]
> This v6 alpha requires React Native 0.82 or newer. Its runtime modules are
> TurboModule-only, and the old architecture is not supported. It is not a production release.

![React Native Logo](https://user-images.githubusercontent.com/2648655/198584674-f0c46e71-1c21-409f-857e-77acaa4daae0.png)

# Adyen React Native

Adyen React Native provides the building blocks to create a checkout experience for your shoppers
and accept their preferred payment methods.

The library supports identity-bound embedded Components, headless payment submission, and a thin
Drop-in façade. See [Feature support](docs/FeatureSupport.md) for the platform and flow support
matrix before choosing an integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Expo](#expo-integration)
  - [Manual Integration](#manual-integration)
- [Usage](#usage)
  - [Configuration](#configuration)
  - [Opening Payment component](#opening-payment-component)
  - [Sessions Flow](#sessions-flow)
  - [Advanced Flow](#advanced-flow)
  - [Handling Actions](#handling-actions)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Prerequisites

- [Adyen test account](https://www.adyen.com/signup)
- [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key)
- [Client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key)
- React Native 0.82 or newer, with the New Architecture enabled
- iOS 16.0 or newer for iOS applications

# Installation

Add `@adyen/react-native` to your React Native project:

```bash
yarn add @adyen/react-native
```

## Expo Integration

> [!IMPORTANT]
> This library is not compatible with Expo Go. Use
> [Continuous Native Generation](https://docs.expo.dev/workflow/overview/#continuous-native-generation-cng).

Add the `@adyen/react-native` plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": ["@adyen/react-native"]
  }
}
```

<details>
<summary><strong>Plugin Configuration Options</strong></summary>

| Option               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `merchantIdentifier` | Sets the Apple Pay merchant ID in your iOS app entitlement file. Empty by default. |
| `useFrameworks`      | Adjusts iOS imports when your `Podfile` enables `use_frameworks!`.                 |

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
> If you have plugin issues, prebuild the native projects and inspect the generated files:
>
> ```bash
> npx expo prebuild --clean
> ```

## Manual Integration

Install CocoaPods after adding the package:

```bash
npx pod-install
```

<details>
<summary><strong>iOS Setup</strong></summary>

Set your application's deployment target to iOS 16.0 or newer. Add the redirect handler to
`AppDelegate.swift`, before any competing deep-link handlers:

```swift
import AdyenCheckout
import React

func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
) -> Bool {
    Checkout.handleReturn(url: url) ||
        RCTLinkingManager.application(application, open: url, options: options)
}
```

Add your [custom URL scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)
or Universal Link to the application. For Apple Pay, follow
[Enable Apple Pay for iOS](https://docs.adyen.com/payment-methods/apple-pay/enable-apple-pay?tab=i_os_2).

</details>

<details>
<summary><strong>Android Setup</strong></summary>

Set Kotlin 2.3.21 in the consuming root project and pin the root Kotlin Gradle plugin to that
version:

```groovy
buildscript {
    ext {
        kotlinVersion = "2.3.21"
    }

    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}
```

Provide the checkout activity in `MainActivity.kt`:

```kotlin
import android.content.Intent
import android.os.Bundle
import com.adyenreactnativesdk.AdyenCheckout

class MainActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        AdyenCheckout.setLauncherActivity(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        AdyenCheckout.handleIntent(intent)
    }
}
```

Add an `intent-filter` with your custom scheme to the checkout activity:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:path="/payment" />
</intent-filter>
```

Ensure the application theme extends `Theme.MaterialComponents`:

```xml
<style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
    <!-- Your configuration here -->
</style>
```

</details>

# Usage

For an introduction to checkout UI, see Adyen's
[prebuilt UI documentation](https://docs.adyen.com/online-payments/prebuilt-ui). This alpha uses
the static `AdyenCheckout` setup APIs rather than a provider component or hook.

## Configuration

Configuration is an input to every setup call. It is not exposed by the returned `Checkout`.

```ts
import type { Configuration } from '@adyen/react-native';

const configuration: Configuration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
};
```

`clientKey` is required. Supply `countryCode` when the selected payment method requires it. Read the [configuration reference][configuration] for card, Apple Pay, Google Pay, and iOS address-lookup options.

### Return URL

Use a custom URL scheme, App Link, or Universal Link that your application owns as `returnUrl`.
Pass it explicitly when your server creates either a `/sessions` or `/payments` request. To use Drop-In derive it from a Drop-in API:

```js
const dropInReturnUrl = Platform.select({
  ios: 'myapp://payment',
  android: await AdyenDropIn.getReturnURL(),
});
```

## Opening Payment component // TODO

Set up a checkout first, then render `AdyenComponent` with a `CheckoutTarget`. Use the payment
method `type` for regular methods and the exact stored payment method `id` for stored methods.

```tsx
import {
  AdyenCheckout,
  AdyenComponent,
} from '@adyen/react-native';

const checkout = await AdyenCheckout.setup(session, configuration, callbacks);

// Scenario 1: Render whole list of payment methods

for (const pm of checkout.paymentMethods.regular) {
  const controller = await checkout.createController(pm);
  return <AdyenComponent controller={controller} />; // Render Forms and buttons
}

// Scenario 2: Render specific payment method

const openBanking = checkout.paymentMethods.regular.first((pm) => pm.type === 'openBanking');
const controller = await checkout.createController(openBanking);
if (controller.requiresUserInput) {
  // Present the component
  return <AdyenComponent controller={controller} />;
} else {
  // Auto-submit
  await controller.submit();
}

// Scenario 3: DropIn

AdyenDropIn.start(checkout);

```

You can use `controller.requiresUserInteraction` and `await controller.submit()` for headless
flows. All checkout commands are asynchronous. A checkout has one interactive operation at a time,
so competing explicit headless or Drop-in starts reject with `operationBusy`.

### Sessions Flow

Create a sessions checkout with `AdyenCheckout.setup`. The completion or error callback is
terminal; native cleanup follows it automatically. Use `invalidate()` when a shopper abandons an
otherwise active flow.

```ts
import {
  AdyenCheckout,
  BeforeSubmitResult,
  type SessionCallbacks,
} from '@adyen/react-native';

const callbacks: SessionCallbacks = {
  onComplete(result) {
    // Read the portable result and update your UI.
    console.log(result.resultCode);
  },
  onError(error) {
    console.error(error.errorCode);
  },
  async onBeforeSubmit(data) {
    return BeforeSubmitResult.proceed(data);
  },
};

const checkout = await AdyenCheckout.setup(session, configuration, callbacks);

// Render <AdyenComponent checkout={checkout} target={card} /> in React.
// Call this when the checkout screen is abandoned before a terminal callback.
await checkout.invalidate();
```

### Advanced Flow

Create an advanced checkout with `AdyenCheckout.setupAdvanced`. Return typed results from setup-time
callbacks instead of retaining a native component handle.

```ts
import {
  AdditionalDetailsResult,
  AdyenCheckout,
  SubmitResult,
  type AdvancedCallbacks,
} from '@adyen/react-native';

const callbacks: AdvancedCallbacks = {
  async onSubmit(data) {
    const response = await api.makePayment(data, {
      returnUrl: configuration.returnUrl,
    });
    return response.action
      ? SubmitResult.action(response.action)
      : SubmitResult.completed(response.resultCode);
  },
  async onAdditionalDetails(data) {
    const response = await api.makePaymentDetails(data);
    return AdditionalDetailsResult.completed(response.resultCode);
  },
  onComplete(result) {
    console.log(result.resultCode);
  },
  onError(error) {
    console.error(error.errorCode);
  },
};

const checkout = await AdyenCheckout.setupAdvanced(
  paymentMethods,
  configuration,
  callbacks
);
```

## Handling Actions

`SubmitResult.action` forwards an action returned by `/payments` to the configured checkout.
`SubmitResult.completed` finishes the advanced flow, and `SubmitResult.retry` lets the shopper
correct payment details. Additional details return `AdditionalDetailsResult.completed`. No embedded
component handle or imperative hide operation is part of this API.

### Drop-in

Drop-in only receives the checkout you already set up:

```ts
import { AdyenDropIn } from '@adyen/react-native';

await AdyenDropIn.start(checkout);
```

Android session Drop-in is supported through official v6 APIs. Android advanced Drop-in is
unsupported before launch on `6.0.0-alpha.1`, and iOS Drop-in is unsupported without UI. Handle
the resulting `unsupportedCapability` error instead of adding a legacy fallback.

### Standalone Action handling

For an API-only action flow, use `AdyenAction`. It is independent from a checkout and can be
cancelled with `hide()`:

```ts
import { AdyenAction } from '@adyen/react-native';

const details = await AdyenAction.handle(apiResponse.action, configuration);
await api.makePaymentDetails(details);
await AdyenAction.hide();
```

On Android, standalone `RedirectAction` is unsupported on `6.0.0-alpha.1` because the published
SDK has no safe return-correlation hook. Supported non-redirect Action kinds remain available. See
[Feature support](docs/FeatureSupport.md) for the platform-qualified behavior.

# Documentation

- [Migration guide](docs/MigrationGuide.md)
- [Compatibility](docs/Compatibility.md)
- [Architecture](docs/Architecture.md)
- [JavaScript architecture](docs/js-architecture.md)
- [Native architecture](docs/native-architecture.md)
- [Public API flows](docs/public-api-flows.md)
- [Configuration][configuration]
- [Feature support](docs/FeatureSupport.md)
- [Localization][localization]
- [UI customization][customization]
- [Error codes](docs/Error%20codes.md)
- [Drop-in documentation][adyen-docs-dropin]
- [Component documentation][adyen-docs-components]

## Contributing

We strongly encourage you to contribute to this repository so everyone can benefit from:

- New features and functionality
- Resolved bug fixes and issues
- General improvements

Read the [contribution guidelines](CONTRIBUTING.md) to get started.

# Support

If you have a feature request, or find a bug or technical problem, [create a GitHub
issue](https://github.com/Adyen/adyen-react-native/issues/new/choose). For other questions,
contact our Support Team through [Customer Area](https://ca-live.adyen.com/ca/ca/contactUs/support.shtml)
or email support@adyen.com.

# License

MIT license. For more information, see the [LICENSE](LICENSE) file.

[configuration]: docs/Configuration.md
[localization]: docs/Localization.md
[customization]: docs/Customization.md
[adyen-docs-dropin]: https://docs.adyen.com/online-payments/react-native/drop-in
[adyen-docs-components]: https://docs.adyen.com/online-payments/react-native/components
