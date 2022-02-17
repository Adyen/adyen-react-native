
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

1. Add `com.adyenreact.AdyenDropInService` to manifest:

`<service
  android:name="com.adyenreact.AdyenDropInService"
  android:permission="android.permission.BIND_JOB_SERVICE"/>`

## Usage
```javascript
import { AdyenDropIn } from '@adyen/react-native';

<Button
  title="Checkout"
  onPress={() => {
    const eventEmitter = new NativeEventEmitter(AdyenDropIn);
    this.didSubmitListener = eventEmitter.addListener('didSubmitCallback', didSubmit);
    this.didProvideListener = eventEmitter.addListener('didProvideCallback', didProvide);
    this.didCompleteListener = eventEmitter.addListener('didCompleteCallback', didComplete);
    this.didFailListener = eventEmitter.addListener('didFailCallback', didFail);

    AdyenDropIn.open(paymentMethods, configuration);
  }}
/>
```
