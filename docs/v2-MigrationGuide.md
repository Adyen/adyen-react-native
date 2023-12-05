# Migration guide v2

## Breacking changes

* Merchant's app theme must be decendent of `Theme.MaterialComponents` to operate with "instant" payment components (ex. Paypal, Klarna)
```xml
<style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
    <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar"> 
```

## Non breacking changes

* `<service android:name="com.adyenreactnativesdk.component.dropin.AdyenCheckoutService" android:exported="false" />` no longer required from app's manifest.
