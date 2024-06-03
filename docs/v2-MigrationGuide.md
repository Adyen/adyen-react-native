# Migration guide v2

## Breaking changes

### Android

* Merchant's app theme must be descendent of `Theme.MaterialComponents` to operate with "instant" payment components (ex. Paypal, Klarna). Example:
```xml
    <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar"> 
```
* `adyenReactNativeRedirectScheme` was deprecated. Use any [intentFilter](https://developer.android.com/guide/components/intents-filters). SDK will still provides `returnUrl` value inside of the `onSubmit.data` in case it is needed, be cautious to not override it. Also, for Android Drop-in `await AdyenDropIn.getReturnURL()` can be used to extract a `returnUrl`.

## Non breaking changes

* `<service android:name="com.adyenreactnativesdk.component.dropin.AdyenCheckoutService" android:exported="false" />` no longer required from app's manifest.
