[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v5.7.0-brightgreen.svg)](https://github.com/Adyen/adyen-ios/releases/tag/5.7.0)
[![Adyen Android](https://img.shields.io/badge/android-v5.3.1-brightgreen.svg)](https://github.com/Adyen/adyen-android/releases/tag/5.3.1)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Adyen_adyen-react-native&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Adyen_adyen-react-native)


![React Native Logo](https://user-images.githubusercontent.com/2648655/198584674-f0c46e71-1c21-409f-857e-77acaa4daae0.png)

# Adyen React Native

Adyen React Native provides you with the building blocks to create a checkout experience for your shoppers, allowing them to pay using the payment method of their choice.

You can integrate with Adyen React Native in two ways:

- [Drop-in](adyen-docs-dropin): React Native wrapper for native iOS and Android Adyen Drop-in - an all-in-one solution, the quickest way to accept payments on your React Native app.
- [Components](adyen-docs-components): React Native wrapper for native iOS and Android Adyen Components - one Component per payment method that can be combined with your own payments flow.

## Contributing

We strongly encourage you to contribute to our repository. Find out more in our [contribution guidelines](https://github.com/Adyen/.github/blob/master/CONTRIBUTING.md)

## Prerequisites

* [Adyen test account](https://www.adyen.com/signup)
* [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key)
* [Client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key)

## Integration

Add `@adyen/react-native` to your react-native project.
```bash
yarn add @adyen/react-native
```

## Expo integration (experimental)

> ❕ Please pay attention that this library is not compatible with ExpoGo. You can use it only with **Expo managed workflow**.

Add `@adyen/react-native` plugin to your `app.json`;

```js
{
  "expo": {
    "plugins": ["@adyen/react-native"]
  }
}

```

> In case you are facing issues with the plugin, please pre-build your app and investigate the files generated:
>
> ```bash
> npx expo prebuild --clean
> ```

### Expo plugin configuration

#### merchantIdentifier

Sets ApplePay Merchant ID to your iOS app's entitlment file. Empty by default.

#### useFrameworks

Adjust `import` on iOS in case your `Podfile` have `use_frameworks!` enabled.

#### Example

```js
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

## Manual Integration

### iOS integration

1. run `pod install`
2. add return URL handler to your `AppDelegate.m(m)`
```objc
#import <adyen-react-native/ADYRedirectComponent.h>

...

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [ADYRedirectComponent applicationDidOpenURL:url];
}
```

In case you are using `RCTLinkingManager` or other deep-linking techniques, place `ADYRedirectComponent.applicationDidOpenURL` before them.

```objc
- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [ADYRedirectComponent applicationDidOpenURL:url] || [RCTLinkingManager application:application openURL:url options:options];
}
```

For Universal Link support, use:
```objc
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {
   NSURL *url = [userActivity webpageURL];
    if (![url isEqual:[NSNull null]] && [ADYRedirectComponent applicationDidOpenURL:url]) {
      return YES;
    }
  }
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return result || [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}
```

> ❕ If your `Podfile` has `use_frameworks!`, then change import path in `AppDelegate.m(m)` to use underscore(`_`) instead of hyphens(`-`):
> 
> ```objc
> #import <adyen_react_native/ADYRedirectComponent.h>
> ```

3. Add [custom URL Scheme](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app) to your app.

#### For ApplePay

Follow general [Enable ApplePay for iOS](https://docs.adyen.com/payment-methods/apple-pay/enable-apple-pay?tab=i_os_2) guide.

### Android integration

1. Provide your Checkout activity to `AdyenCheckout` in `MainActivity.java`.
```java
import com.adyenreactnativesdk.AdyenCheckout;
import android.os.Bundle;

...

@Override
protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(null);
  AdyenCheckout.setLauncherActivity(this);
}
```

##### For standalone components

1. Add `intent-filter` to your Checkout activity:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:path="/payment" />
</intent-filter>
```

2. To enable standalone redirect components, return URL handler to your Checkout activity `onNewIntent` in `MainActivity.java`:
```java
import android.content.Intent;

...

@Override
public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    AdyenCheckout.handleIntent(intent);
}
```

3. To enable GooglePay, pass state to your Checkout activity `onActivityResult` in `MainActivity.java`:
```java
@Override
public void onActivityResult(int requestCode, int resultCode, Intent data) {
  super.onActivityResult(requestCode, resultCode, data);
  AdyenCheckout.handleActivityResult(requestCode, resultCode, data);
}
```

4. Make sure your main app theme is decendent of `Theme.MaterialComponents`.

```xml
  <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
    <!-- Your configuration here -->
  </style>
```

## Usage

For general understanding of how prebuilt UI components of Adyen work you can follow [our documentation](https://docs.adyen.com/online-payments/prebuilt-ui).

### Configuration

To read more about other configuration, see the [full list][configuration].
Example of required configuration:

```typescript
import { Configuration } from '@adyen/react-native';

const configuration: Configuration = {
  environment: 'test', // When you're ready to accept real payments, change the value to a suitable live environment.
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 }, // Value in minor units
  returnUrl: 'myapp://payment', // Custom URL scheme of your iOS app. This value is overridden for Android by `AdyenCheckout`. You can also send this property from your backend.
};
```

### Opening Payment component

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

#### Sessions flow

```javascript
import { AdyenCheckout } from '@adyen/react-native';
import { useCallback } from 'react';

  const onComplete = useCallback( (result, nativeComponent ) => {
    /* When this callbeck executed, you must call `component.hide(true | false)` to dismiss the payment UI. */
  }, [some, dependency]);
  const onError = useCallback( (error, component) => {
    /* Handle errors or termination by shopper */
    /* When the API request is completed, you must now call `component.hide(false)` to dismiss the payment UI. */
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

#### Advanced flow

```javascript
import { AdyenCheckout } from '@adyen/react-native';
import { useCallback } from 'react';

  const onSubmit = useCallback( (data, nativeComponent ) => {
    /* Call your server to make the `/payments` request, make sure you pass `returnUrl:data.returnUrl` to make redirect flow work cross platform */
    /* When the API request contains `action`, you should call `component.handle(response.action)` to dismiss the payment UI. */
    /* When the API request is completed, you must now call `component.hide(true | false)` to dismiss the payment UI. */
  }, [some, dependency]);
  const onAdditionalDetails = useCallback( (paymentData, component) => {
    /* Call your server to make the `/payments/details` request */
    /* When the API request is completed, you must now call `component.hide(true | false)` to dismiss the payment UI. */
  }, []);
  const onError = useCallback( (error, component) => {
    /* Handle errors or termination by shopper */
    /* When the API request is completed, you must now call `component.hide(false)` to dismiss the payment UI. */
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

### Handling Actions

Some payment methods require additional action from the shopper such as: to scan a QR code, to authenticate a payment with 3D Secure, or to log in to their bank's website to complete the payment. To handle these additional front-end chalanges, use `nativeComponent.handle(action)` from  `onSubmit` callback.

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

#### Standalone Action handling

In case of API-only integration `AdyenAction.handle` could be used.
Before you begin, make sure you follow all [iOS integration](#ios-integration) and [Android integration](#android-integration) steps.

Example:
```js
import { AdyenAction } from '@adyen/react-native';

const data = await AdyenAction.handle(apiResponse.action, { environment: 'test', clientKey: '{YOUR_CLIENT_KEY}');
result = await ApiClient.paymentDetails(data);
```

## Documentation

- [Configuration][configuration]
- [Localization][localization]
- [UI Customization][customization]
- [Error codes](/docs/Error%20codes.md)
- [Drop-in documentation][adyen-docs-dropin]
- [Component documentation][adyen-docs-components]

## Support

If you have a feature request, or spotted a bug or a technical problem, create a GitHub issue. For other questions, contact our [support team](https://www.adyen.help/hc/en-us/requests/new?ticket_form_id=360000705420).

## License

MIT license. For more information, see the LICENSE file.

[client.key]: https://docs.adyen.com/online-payments/android/drop-in#client-key
[configuration]: /docs/Configuration.md
[localization]: /docs/Localization.md
[customization]: /docs/Customization.md
[adyen-docs-dropin]: https://docs.adyen.com/online-payments/react-native/drop-in
[adyen-docs-components]: https://docs.adyen.com/online-payments/react-native/components
