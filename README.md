
# adyen-react-native

## Getting started

`$ npm install @adyen/react-native --save`

### Mostly automatic installation

`$ react-native link @adyen/react-native`

`yarn`

### Manual installation


#### iOS

1. run `pod install`

#### Android

1. Add
2. Add `com.adyenreact.AdyenDropInService` to manifest:

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
        } } />

    </View>
  )}
  </AdyenPaymentProvider>
```
