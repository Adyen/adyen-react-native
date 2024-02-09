# Localization

By default, the React Native library uses a device's locale. To enable necessary translations for iOS, make sure “Localizations” in the project configuration contains all required languages. If the device's locale is not supported, localization fallback to `en-US`.

## Enforcing specific localization

Provide a specific locale to `configuration.locale` for `AdyenCheckout`. 

> [!IMPORTANT]
> For Session flow `locale` will match value provided by your backend.

## Overriding default values

### iOS

1. Open your iOS folder in Xcode.
2. Create a new ’Strings’ file with the name `Localizable`. If you are using multiple localizations, make sure you check them all in for the `Localizations.string` in "File Inspector". For each localization, your iOS project will have a corresponding file: `(localization).lproj/Localizable.string`.
3. Override all necessary strings with desired values for all your localizations. The list of available strings can be found [here](https://github.com/Adyen/adyen-ios/blob/develop/Adyen/Assets/Generated/LocalizationKey.swift).

### Android

1. Open /res/values/strings.xml in "Translations Editor” in Android Studio.
2. Override all necessary strings with desired values for all your localizations. The list of available strings can be found [here](https://github.com/search?q=repo%3AAdyen%2Fadyen-android+res%2Fvalues%2Fstrings.xml&type=code&branch=main)

## Adding new localizations

Add new locales in Xcode and Android Studio respectively. Provide a translation for all necessary keys.

List of currently avaialble locales:

| Language | Locale code | Fallback |
| --- | --- | :---: |
| Arabic - International | ar | |
| Chinese - Simplified | zh-CN | |
| Chinese - Traditional | zh-TW | |
| Croatian | hr-HR | |
| Czech | cs-CZ | |
| Danish | da-DK | |
| Dutch | nl-NL | |
| English - US | en-US | ✱ |
| Finnish | fi-FI | |
| French | fr-FR | |
| German | de-DE | |
| Greek | el-GR | |
| Hungarian | hu-HU | |
| Italian | it-IT | |
| Japanese | ja-JP | |
| Korean | ko-KR | |
| Norwegian | no-NO | |
| Polish | pl-PL | |
| Portuguese - Brazil | pt-BR | |
| Portuguese - Portugal | pt-PT | |
| Romanian | ro-RO | |
| Russian | ru-RU | |
| Slovak | sk-SK | |
| Slovenian | sl-SI | |
| Spanish | es-ES | |
| Swedish | sv-SE | |
