[![npm version](https://img.shields.io/npm/v/@adyen/react-native.svg?style=flat-square)](https://www.npmjs.com/package/@adyen/react-native)
[![Adyen iOS](https://img.shields.io/badge/ios-v4.7.0-brightgreen.svg)](https://github.com/Adyen/adyen-ios)
[![Adyen Android](https://img.shields.io/badge/android-v4.4.0-brightgreen.svg)](https://github.com/Adyen/adyen-android)


![Checkout_react_native_beta](https://user-images.githubusercontent.com/2648655/155735539-84066a1f-516c-456b-97a2-f0ba643f875c.png)

# Adyen Checkout React Native SDK [BETA - Not for production usage]

> This project is currently under development. Timelines and scope are still to be defined.

React native wrapper for native iOS and Android Adyen Components. This library allows you to accept in-app payments by providing you with the building blocks you need to create a checkout experience.

## Contributing
We strongly encourage you to contribute to our repository. Find out more in our [contribution guidelines](https://github.com/Adyen/.github/blob/master/CONTRIBUTING.md)

## Requirements
Drop-in and Components require a [client key][client.key], that should be provided in the `Configuration`.

## Installation

Add `@adyen/react-native` to your react-native project.

`$ yarn add @adyen/react-native`

### iOS integration

1. run `pod install`
2. add return URL handler to your `AppDelegate.m`
  ```objc
  @import adyen_react_native;

  ...

  - (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
    return [RedirectComponentProxy proccessURL:url];
  }
  ```
3.

#### Android integration

1. Add `AdyenDropInService` to manifest:

```xml
<service
  android:name="com.adyenreactnativesdk.AdyenDropInService"
  android:permission="android.permission.BIND_JOB_SERVICE"/>
```

## Usage

For general understanding of how prebuilt UI components of Adyen work you can follow [our documentation](https://docs.adyen.com/online-payments/prebuilt-ui).

### Configuration

Example of configuration properties:

```javascript
const configuration = {
  environment: 'test', // live, live-us, live-au
  channel: channel, // iOS, Android. Added automatically by AdyenPaymentProvider
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 },
  reference: 'React Native', // The reference to uniquely identify a payment.
  returnUrl: 'myapp://', // This value is overridden for Android DropIn
  shopperReference: 'Checkout Shopper', // Your reference to uniquely identify this shopper
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  shopperLocale: 'en-US',
  additionalData: { allow3DS2: true },
};
```

### Opening Payment component

To use `@adyen/react-native` you can use our helper component `AdyenPaymentProvider` with `AdyenCheckoutContext.Consumer` directly:

```javascript
import {
  AdyenPaymentProvider,
  AdyenCheckoutContext,
} from '@adyen/react-native';

<AdyenPaymentProvider
  config={configuration}
  paymentMethods={paymentMethods}
  onSubmit={didSubmit}
  onProvide={didProvide}
  onFail={didFail}
  onComplete={didComplete} >
    <AdyenCheckoutContext.Consumer>
      {({ start }) => (
        <Button
          title="Open DropIn"
          onPress={() => { start('AdyenDropIn'); }}
        />
      )}
    </AdyenCheckoutContext.Consumer>
</AdyenPaymentProvider>
```

Or use helper `useAdyenCheckout` with standalone component:

```javascript
import { useAdyenCheckout } from '@adyen/react-native';

const MyChekoutView = () => {
  const { start } = useAdyenCheckout();

  return (
      <Button
        title="Open DropIn"
        onPress={() => { start('AdyenDropIn'); }} />
      );
};
```

```javascript
import { AdyenPaymentProvider } from '@adyen/react-native';

<AdyenPaymentProvider
  config={configuration}
  paymentMethods={paymentMethods}
  onSubmit={didSubmit}
  onProvide={didProvide}
  onFail={didFail}
  onComplete={didComplete} >
    <MyChekoutView />
</AdyenPaymentProvider>
```

Or manage native events by

```javascript
import { NativeModules } from 'react-native';

<Button
  title="Checkout"
  onPress={() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.AdyenDropIn);
    this.didSubmitListener = eventEmitter.addListener('PAYMENT_SUBMIT_EVENT', onSubmit);
    this.didProvideListener = eventEmitter.addListener('PAYMENT_PROVIDE_DETAILS_EVENT', onProvide);
    this.didCompleteListener = eventEmitter.addListener('PAYMENT_COMPLETED_EVENT', onComplete);
    this.didFailListener = eventEmitter.addListener('PAYMENT_FAILED_EVENT', onFail);

    AdyenDropIn.open(paymentMethods, configuration);
  }}
/>
```

## Documentation
> :construction: **Work in progress**

## Support
If you have a feature request, or spotted a bug or a technical problem, create a GitHub issue. For other questions, contact our [support team](https://support.adyen.com/hc/en-us/requests/new?ticket_form_id=360000705420).    

## License    
MIT license. For more information, see the LICENSE file.


[client.key]: https://docs.adyen.com/online-payments/android/drop-in#client-key
