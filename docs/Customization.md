# UI Customization

## iOS

Create swift class 'AdyenAppearance' extending protocol 'AdyenAppearanceProvider'.
Please make sure that the name of the class exactly matches.
SDK will use reflection to find the class with this exact name.

```swift
import Adyen
import adyen_react_native

class AdyenAppearance: AdyenAppearanceProvider {
  static func createStyle() -> Adyen.DropInComponent.Style {
     # provide your custom style here
  }
}
```

## Android

Locate correspondent resources from [Android SDK](https://github.com/Adyen/adyen-android/tree/4.10.0) and override them in the local `android\app\src\main\res` folder according to your needs.
