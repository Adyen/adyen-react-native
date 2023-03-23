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
2. Create a new ’Strings’ file with the name `Localizable`. If you are using multiple localizations, make sure you check them all in for the `Localizations.string` in "File Inspector". For each localization, your iOS project will have a corresponding file: `(localization).lproj/Localizable.string`.
3. Override all necessary strings with desired values for all your localizations. The list of available strings can be found at https://github.com/Adyen/adyen-ios/blob/develop/Adyen/Assets/Generated/LocalizationKey.swift.

### Android

1. Open /res/values/strings.xml in "Translations Editor” in Android Studio.
2. Override all necessary strings with desired values for all your localizations. The list of available strings can be found at https://github.com/search?q=repo%3AAdyen%2Fadyen-android+values%2Fstrings.xml&type=code

## Adding new localizations

Add new locales in Xcode and Android Studio respectively. Provide a translation for all necessary keys.

List of currently avaialble locales:

| Locale |
| --- |
| zh-CN |
| ru-RU |
| ja-JP |
| en-US |
| es-ES |
| it-IT |
| da-DK |
| de-DE |
| pl-PL |
| zh-TW |
| nl-NL |
| pt-BR |
| fr-FR |
| sv-SE |
| ko |
| nb-NO |
| fi |
| sk-SK |
| ro-RO |
| el-GR |
| hr-HR |
| hu-HU |
| cs-CZ |
| sl-SI |
| ar |
