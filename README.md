[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v5.22.1-brightgreen.svg)](https://github.com/Adyen/adyen-ios/releases/tag/5.22.1)
[![Adyen Android](https://img.shields.io/badge/android-v5.16.0-brightgreen.svg)](https://github.com/Adyen/adyen-android/releases/tag/5.16.0)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Adyen_adyen-react-native&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Adyen_adyen-react-native)

> [!Important]
> **React Native New Architecture Support** </br>
>
> The **New Architecture** for React Native is exclusively supported on versions **0.76.0 and above**.
>
> For projects using versions lower than 0.76.0, please:
>
> - Continue utilizing the **Old Architecture**.
> - Alternatively, disable bridgeless mode by setting `load(bridgelessEnabled=false)`.

> [!Note]
>
> For compatibility with officially unsupported versions below v0.74 check [this document](docs/Compatibility.md).

![React Native Logo](https://user-images.githubusercontent.com/2648655/198584674-f0c46e71-1c21-409f-857e-77acaa4daae0.png)

# Adyen React Native

Adyen React Native provides you with the building blocks to create a checkout experience for your shoppers, allowing them to pay using the payment method of their choice.

You can integrate with Adyen React Native in two ways:

- [Drop-in][adyen-docs-dropin]: React Native wrapper for native iOS and Android Adyen Drop-in - an all-in-one solution, the quickest way to accept payments on your React Native app.
- [Components][adyen-docs-components]: React Native wrapper for native iOS and Android Adyen Components - one Component per payment method that can be combined with your own payments flow.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Expo](#expo-integration)
  - [Manual Integration](#manual-integration)
- [Usage](#usage)
  - [Configuration](#configuration)
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

# Installation

Add `@adyen/react-native` to your React Native project:

```bash
yarn add @adyen/react-native
```

## Expo Integration

> [!IMPORTANT]
>
> This library is not compatible with Expo Go. It is designed exclusively for use with the [Continuous Native Generation](https://docs.expo.dev/workflow/overview/#continuous-native-generation-cng).

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

> [!NOTE]
>
> For Objective-C and Java integration, see the [legacy documentation](https://github.com/Adyen/adyen-react-native/tree/2.9.0?tab=readme-ov-file#ios-integration).

<details>
<summary><strong>iOS Setup</strong></summary>

1. Run `pod install`

2. Add `returnURL` handler to your `AppDelegate.swift`:

```swift
import Adyen

// ...

func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return RedirectComponent.applicationDidOpen(from: url)
}
```

If using `RCTLinkingManager` or other deep-linking techniques, place `ADYRedirectComponent.applicationDidOpen` before them:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return RedirectComponent.applicationDidOpen(from: url) || RCTLinkingManager.application(app, open: url, options: options)
}
```

For Universal Link support:

```swift
func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL,
       RedirectComponent.applicationDidOpen(from: url) {
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

To read more about other configuration, see the [full list][configuration].
Example of required configuration:

```typescript
import { Configuration } from '@adyen/react-native';

const configuration: Configuration = {
  environment: 'test', // When you're ready to accept real payments, change the value to a suitable live environment.
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 }, // Value in minor units
  returnUrl: 'myapp://payment', // See description below.
};
```

### Return URL

> [!IMPORTANT]
>
> On `config` use a custom URL scheme or App/Universal link of your app(s).

<table>
<tr>
  <th> Scenario </th> 
  <th> How to use </th>
</tr>
<tr>
  <td> Advanced flow </td> 
  <td> 
    
  During `onSubmit(data, component, extras)` pass `"returnUrl": data.returnUrl` to make `\payments` API call. 
    
  </td>
</tr>
<tr>
  <td> Sessions flow </td> 
  <td>

To make `\sessions` API call use `AdyenDropIn.getReturnURL()` to fetch `returnUrl`.

```js
const returnUrl = Platform.select({
  ios: 'myapp://payment',
  android: await AdyenDropIn.getReturnURL(),
});
```

  </td>
</tr> 
</table>

## Opening Payment component

To use `@adyen/react-native` you can use our helper component `AdyenCheckout` and helper functions from `useAdyenCheckout` with standalone component:

```javascript
import { useAdyenCheckout } from '@adyen/react-native';

const MyCheckoutView = () => {
  const { start } = useAdyenCheckout();

  return (
    <Button
      title="Open DropIn"
      onPress={() => {
        start('dropIn');
      }}
    />
  );
};
```

### Sessions Flow

```javascript
import { AdyenCheckout } from '@adyen/react-native';
import { useCallback } from 'react';

const onComplete = useCallback((result, component) => {
  // Payment was completed - call `component.hide(true)` to dismiss the payment UI.
  // Call /sessions/(sessionId)?sessionResult={result} API to get more information about the payment outcome.
}, []);

const onError = useCallback((error, component) => {
  // Payment was terminated by shopper or encountered an error
  // Call `component.hide(false)` to dismiss the payment UI.
}, []);

<AdyenCheckout
  config={configuration}
  session={session}
  onComplete={onComplete}
  onError={onError}
>
  <MyCheckoutView />
</AdyenCheckout>;
```

### Advanced Flow

```javascript
import { AdyenCheckout } from '@adyen/react-native';
import { useCallback } from 'react';

const onSubmit = useCallback((data, component) => {
  // Call your server to make the `/payments` request
  // Pass `returnUrl: data.returnUrl` for cross-platform redirect flow
  // If response contains `action`, call `component.handle(response.action)`
  // Otherwise, call `component.hide(true | false)` to dismiss the payment UI
}, []);

const onAdditionalDetails = useCallback((paymentData, component) => {
  // Call your server to make the `/payments/details` request
  // Call `component.hide(true | false)` to dismiss the payment UI
}, []);

const onError = useCallback((error, component) => {
  // Payment was terminated by shopper or encountered an error
  // Call `component.hide(false)` to dismiss the payment UI
}, []);

<AdyenCheckout
  config={configuration}
  paymentMethods={paymentMethods}
  onSubmit={onSubmit}
  onAdditionalDetails={onAdditionalDetails}
  onError={onError}
>
  <MyCheckoutView />
</AdyenCheckout>;
```

## Handling Actions

Some payment methods require additional action from the shopper such as: to scan a QR code, to authenticate a payment with 3D Secure, or to log in to their bank's website to complete the payment. To handle these additional front-end challenges, use `nativeComponent.handle(action)` from `onSubmit` callback.

```javascript
const handleSubmit = (paymentData, nativeComponent) => {
  server.makePayment(paymentData)
    .then((response) => {
      if (response.action) {
        nativeComponent.handle(response.action);
      } else {
        nativeComponent.hide(response.result);
      }
    });
};

<AdyenCheckout
  ...
  onSubmit={handleSubmit}
  >
    ...
</AdyenCheckout>
```

### Standalone Action handling

In case of API-only integration `AdyenAction.handle` could be used.
Before you begin, make sure you follow all [iOS integration](#ios-integration) and [Android integration](#android-integration) steps.

Example:

```js
import { AdyenAction } from '@adyen/react-native';

const data = await AdyenAction.handle(apiResponse.action, { environment: 'test', clientKey: '{YOUR_CLIENT_KEY}');
result = await ApiClient.paymentDetails(data);
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
