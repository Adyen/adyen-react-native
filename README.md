
# adyen-react-native

## Getting started

`$ npm install @adyen/react-native --save`

### Mostly automatic installation

`$ react-native link @adyen/react-native`

`yarn`

### Manual installation


#### iOS

1. run `pod install`
2. add return URL and
  ```objc
  - (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
    return [RedirectComponentProxy proccessURL:url];
  }
  ```
3.

#### Android

1. Add `AdyenDropInService` to manifest:

`<service
  android:name="com.adyenreactnativesdk.AdyenDropInService"
  android:permission="android.permission.BIND_JOB_SERVICE"/>`

## Usage

```javascript
import {
  AdyenDropIn,   
  PAYMENT_SUBMIT_EVENT,
  PAYMENT_PROVIDE_DETAILS_EVENT,
  PAYMENT_COMPLETED_EVENT,
  PAYMENT_FAILED_EVENT
} from '@adyen/react-native';

<Button
  title="Checkout"
  onPress={() => {
    const eventEmitter = new NativeEventEmitter(AdyenDropIn);
    this.didSubmitListener = eventEmitter.addListener(PAYMENT_SUBMIT_EVENT, onSubmit);
    this.didProvideListener = eventEmitter.addListener(PAYMENT_PROVIDE_DETAILS_EVENT, onProvide);
    this.didCompleteListener = eventEmitter.addListener(PAYMENT_COMPLETED_EVENT, onComplete);
    this.didFailListener = eventEmitter.addListener(PAYMENT_FAILED_EVENT, onFail);

    AdyenDropIn.open(paymentMethods, configuration);
  }}
/>
```
