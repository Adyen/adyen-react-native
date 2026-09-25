# Migration guide v2

> [!WARNING]
> **Historical document — not authoritative.** This is a point-in-time snapshot kept for
> reference only; it does **not** describe the current behavior of `@adyen/react-native`. For
> current guidance start with the [current migration guide](../MigrationGuide.md); for current
> behavior see [Architecture.md](../Architecture.md) and [FeatureSupport.md](../FeatureSupport.md).
> The archive index is in [archive/README.md](./README.md).

## Breaking changes

### Android

- Merchant's app theme must be a descendant of `Theme.MaterialComponents` to operate with "instant" payment components (ex. Paypal, Klarna). Example:

```xml
    <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
```

- `adyenReactNativeRedirectScheme` was deprecated. Use any [intentFilter](https://developer.android.com/guide/components/intents-filters). SDK will still provide `returnUrl` value inside of the `onSubmit.data` in case it is needed, be cautious to not override it. Also, for Android Drop-in `await AdyenDropIn.getReturnURL()` can be used to extract a `returnUrl`.

## Non breaking changes

- `<service android:name="com.adyenreactnativesdk.component.dropin.AdyenCheckoutService" android:exported="false" />` no longer required from app's manifest.
