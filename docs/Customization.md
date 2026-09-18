# UI Customization

UI theming is delegated to the Adyen native SDKs this library pins to `6.0.0-alpha.1`
(`package.json` `adyen.ios` / `adyen.android`); there is no cross-platform theming API on the
React Native surface.

## iOS

In **Xcode**, create a Swift class named exactly `AdyenAppearance` that conforms to the
`AdyenAppearanceProvider` protocol. The SDK finds it by reflection: `AdyenAppearanceLoader`
(`ios/Components/AdyenApperance.swift`) looks up a class named `AdyenAppearance` in the loaded
bundles and calls its static `createStyle()` to obtain a `CheckoutTheme`. The class name must match
exactly, or no custom theme is applied.

```swift
import Adyen
import adyen_react_native

class AdyenAppearance: AdyenAppearanceProvider {
  static func createStyle() -> CheckoutTheme {
    // return your custom CheckoutTheme here
  }
}
```

## Android

Android theming is owned entirely by the Adyen Android SDK; this bridge adds no Android theming API.
Follow the Adyen Android SDK
[UI customization docs](https://github.com/Adyen/adyen-android/blob/main/docs/UI_CUSTOMIZATION.md)
for the pinned `6.0.0-alpha.1` SDK.
