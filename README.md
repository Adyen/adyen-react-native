[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v4.10.3-brightgreen.svg)](https://github.com/Adyen/adyen-ios)
[![Adyen Android](https://img.shields.io/badge/android-v4.10.0-brightgreen.svg)](https://github.com/Adyen/adyen-android)

![React Native Logo](https://user-images.githubusercontent.com/2648655/198584674-f0c46e71-1c21-409f-857e-77acaa4daae0.png)

# Adyen React Native [BETA]

> This project is currently under development. Timelines and scope are still to be defined.

Adyen React Native provides you with the building blocks to create a checkout experience for your shoppers, allowing them to pay using the payment method of their choice.

You can integrate with Adyen React Native in two ways:

* Native Drop-in: React Native wrapper for native iOS and Android Adyen Drop-in - an all-in-one solution, the quickest way to accept payments on your React Native app.
* Native Components: React Native wrapper for native iOS and Android Adyen Components - one Component per payment method that can be combinened with your own payments flow.

## Contributing
We strongly encourage you to contribute to our repository. Find out more in our [contribution guidelines](https://github.com/Adyen/.github/blob/master/CONTRIBUTING.md)

## Requirements
Drop-in and Components require a [client key][client.key], that should be provided in the `Configuration`.

## Installation

Add `@adyen/react-native` to your react-native project.
```bash
yarn add @adyen/react-native`
```

### iOS integration

1. run `pod install`
2. add return URL handler to your `AppDelegate.m`
  ```objc
  #import <adyen-react-native/ADYRedirectComponent.h>

  ...

  - (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
    return [ADYRedirectComponent applicationDidOpenURL:url];
  }
  ```
  
#### For ApplePay

Follow general [Enabling ApplePay for iOS](https://docs.adyen.com/payment-methods/apple-pay/enable-apple-pay?tab=i_os_2) guide.

### Android integration

1. Add `AdyenCheckoutService` to manifest:
```xml
<service android:name="com.adyenreactnativesdk.component.dropin.AdyenCheckoutService" android:exported="false" />
```

2. Provide your Checkout activity to `AdyenCheckout`.
```java
@Override
protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  AdyenCheckout.setLauncherActivity(this);
}
```

##### For standalone components

1. [Provide `rootProject.ext.adyenReactNativeRedirectScheme`](https://developer.android.com/studio/build/manage-manifests#inject_build_variables_into_the_manifest) to your App's manifests.
To do so, add folowing to your **App's build.gradle** `defaultConfig`

```groovy
defaultConfig {
    ...
    manifestPlaceholders = [redirectScheme: rootProject.ext.adyenReactNativeRedirectScheme]
}
```

2. Add `intent-filter` to your Checkout activity:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:host="${applicationId}" android:scheme="${redirectScheme}" />
</intent-filter>
```

3. To enable standalone redirect components, return URL handler to your Checkout activity `onNewIntent`:
```java
@Override
public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    AdyenCheckout.handle(intent);
}
```

4. To enable GooglePay, pass state to your Checkout activity `onActivityResult`:
```java
@Override
public void onActivityResult(int requestCode, int resultCode, Intent data) {
  super.onActivityResult(requestCode, resultCode, data);
  AdyenCheckout.handleActivityResult(requestCode, resultCode, data);
}
```

## Usage

For general understanding of how prebuilt UI components of Adyen work you can follow [our documentation](https://docs.adyen.com/online-payments/prebuilt-ui).

### Configuration

To read more about other configuration, see [Full list](docs\Configuration.md).
Example of required configuration:
```javascript
const configuration = {
  environment: 'test', // When you're ready to accept live payments, change the value to one of our live environments.
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 }, // Value in minor units
  returnUrl: 'myapp://payment', // Custom URL scheme of your iOS app. This value is overridden for Android by `AdyenCheckout`. Can be send from your backend
};
```

### Opening Payment component

To use `@adyen/react-native` you can use our helper component `AdyenCheckout` and helper functions from `useAdyenCheckout` with standalone component:
```javascript
import { useAdyenCheckout } from '@adyen/react-native';

const MyChekoutView = () => {
  const { start } = useAdyenCheckout();

  return (
      <Button
        title="Open DropIn"
        onPress={() => { start('dropIn'); }} />
      );
};
```
```javascript
import { AdyenCheckout } from '@adyen/react-native';

<AdyenCheckout
  config={configuration}
  paymentMethods={paymentMethods}
  onSubmit={didSubmit}
  onProvide={didProvide}
  onFail={didFail}
  onComplete={didComplete} >
    <MyChekoutView/>
</AdyenCheckout>
```

### Handling Actions

> :exclamation: Native components only handling actions after payment was **started**(nativeComponent.open) and before it was **hidden**(nativeComponent.hide)
Handling of actions on its own is not supported

Some payment methods require additional action from the shopper such as: to scan a QR code, to authenticate a payment with 3D Secure, or to log in to their bank's website to complete the payment. To handle these additional front-end actions, use `nativeComponent.handle(action)` from  `onSubmit` callback.
```javascript
const handleSubmit = (payload, nativeComponent) => {
  server.makePayment(payload)
    .then((result) => {
      if (result.action) {
        nativeComponent.handle(result.action);
      } else {
        // process result
      }
    });
};

<AdyenCheckout
  ...
  onSubmit={ handleSubmit }
  >
    ...
</AdyenCheckout>
```

## Documentation

- [Configuration](/docs/Configuration.md)
- [Error codes](/docs/Error%20codes.md)

> :construction: ** Adyen Docs documentation in progress**

## Support
If you have a feature request, or spotted a bug or a technical problem, create a GitHub issue. For other questions, contact our [support team](https://www.adyen.help/hc/en-us/requests/new?ticket_form_id=360000705420).    

## License    
MIT license. For more information, see the LICENSE file.


[client.key]: https://docs.adyen.com/online-payments/android/drop-in#client-key
