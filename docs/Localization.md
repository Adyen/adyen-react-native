# Localization

By default, the React Native library uses a device's locale. To enable necessary translations for iOS, make sure “Localizations” in the project configuration contains all required languages.

## Enforcing specific localization

### iOS

Not supported.

### Android

Provide a specific locale to `configuration.shopperLocale` for `AdyenCheckout`.

## Overriding default values

### iOS

1. Open your iOS folder in Xcode.
2. Create new ’Strings’ file with the name “Localizable”. If you are using multiple localisations - make sure you check-in them all for Localizations.string in "File Inspector": your iOS project will have correspondent files for each localization: `(localization).lproj/Localizable.string`.
3. Override all necessary strings with desired values for all necessary localizations. A list of available strings could be found at https://github.com/Adyen/adyen-ios/blob/develop/Adyen/Assets/Generated/LocalizationKey.swift.

### Android

1. Open /res/values/strings.xml in "Translations Editor” in Android Studio.
2. Override all necessary strings with desired values for all necessary localizations. A list of available strings could be found at https://github.com/search?q=repo%3AAdyen%2Fadyen-android+values%2Fstrings.xml&type=code

## Adding new localization

Add new locale in Xcode and Android Studio respectively. Provide a translation for all necessary keys
