
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
import { AdyenPaymentProvider } from '@adyen/react-native';

// TODO: What to do with the module?
<AdyenPaymentProvider
  didSubmit={didSubmit}
  didProvide={didProvide}
  didFail={didFail}
  didComplete={didComplete} >
    { adyenPayment => (
      <View style={[ styles.contentView, contentBackgroundStyle ]}>
      <Button
        title="Open DropIn"
        onPress={ () => {
          adyenPayment.start(configuration);
          AdyenDropIn.openDropIn(paymentMethods, configuration);
        } } />
    </View>
  )}
  </AdyenPaymentProvider>
```
