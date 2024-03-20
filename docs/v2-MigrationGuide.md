# Migration guide v2

## Breacking changes

### Android

* Merchant's app theme must be decendent of `Theme.MaterialComponents` to operate with "instant" payment components (ex. Paypal, Klarna). Example:
```xml
    <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar"> 
```
* `adyenReactNativeRedirectScheme` was deprecared. Use any [intentFilter](https://developer.android.com/guide/components/intents-filters). SDK will still provides `returnUrl` value inside of the `onSubmit.data` in case it is needed, be cautious to not override it.

## Non breacking changes

* `<service android:name="com.adyenreactnativesdk.component.dropin.AdyenCheckoutService" android:exported="false" />` no longer required from app's manifest.
