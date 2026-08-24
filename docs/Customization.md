# UI Customization

## iOS

In **Xcode** create swift class 'AdyenAppearance' and extend the protocol 'AdyenAppearanceProvider'.
SDK will use reflection to find the class with this exact name.

```swift
import Adyen
import adyen_react_native

class AdyenAppearance: AdyenAppearanceProvider {
  static func createStyle() -> CheckoutTheme {
     # provide your custom theme here
  }
}
```

## Android

Follow the Android SDK [Customization docs](https://github.com/Adyen/adyen-android/blob/main/docs/UI_CUSTOMIZATION.md).
