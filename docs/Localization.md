# Localization

By default, the UI uses the device locale. Translations, the set of available locales, and the
fallback behavior are owned by the Adyen native SDKs this library pins to `6.0.0-alpha.1`
(`package.json` `adyen.ios` / `adyen.android`), not by this bridge.

> [!IMPORTANT]
> The two platforms currently handle the configured `locale` asymmetrically. Android reads it with
> `RootConfigurationParser.locale` and applies it as the SDK `shopperLocale` when constructing the
> checkout (`CheckoutConfigurationFactory.get` passes `shopperLocale = rootParser.locale`). iOS
> parses the same value with `RootConfigurationParser.shopperLocale` but does **not** apply it when
> building the checkout configuration — `RootConfigurationParser.checkoutConfiguration(...)` never
> references `shopperLocale`, so the value has no effect on iOS today. On iOS the UI therefore stays
> on the device locale regardless of the configured `locale`.

To enable the necessary translations on iOS, make sure “Localizations” in the project configuration
contains all required languages. When the device locale is not supported, the Adyen iOS SDK falls
back to `en-US`.

Titles of payment methods are fetched from the Adyen API and localized according to the `shopperLocale` value you set in your [/paymentMethods](https://docs.adyen.com/api-explorer/Checkout/68/post/paymentMethods#request-shopperLocale) or [/sessions](https://docs.adyen.com/api-explorer/Checkout/71/post/sessions#request-shopperLocale) requests.

## Enforcing specific localization

Provide a specific `locale` in the `Configuration` object passed to `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`. This is the same [`locale`](Configuration.md) option documented in the configuration reference.

> [!IMPORTANT]
> The `configuration.locale` you pass here is an independent input. The session input this bridge
> accepts exposes only `id` and `sessionData`, so neither platform derives `configuration.locale`
> from, nor validates it against, the backend
> [`shopperLocale`](https://docs.adyen.com/api-explorer/Checkout/71/post/sessions#request-shopperLocale)
> you sent when creating the session. There is no guarantee the two values match; set
> `configuration.locale` explicitly if you need a specific UI locale (subject to the iOS/Android
> application asymmetry noted above).

## Overriding default values

### iOS

1. Open your iOS folder in Xcode.
2. Create a new ’Strings’ file with the name `Localizable`. If you are using multiple localizations, make sure you check them all in for the `Localizations.string` in "File Inspector". For each localization, your iOS project will have a corresponding file: `(localization).lproj/Localizable.string`.
3. Override all necessary strings with desired values for all your localizations. The authoritative list of available strings is defined by the pinned Adyen iOS SDK — see [`LocalizationKey.swift` at `6.0.0-alpha.1`](https://github.com/Adyen/adyen-ios/blob/6.0.0-alpha.1/Adyen/Assets/Generated/LocalizationKey.swift).

### Android

1. Open /res/values/strings.xml in "Translations Editor” in Android Studio.
2. Override all necessary strings with desired values for all your localizations. The authoritative string resources are defined by the pinned Adyen Android SDK — browse the [`adyen-android` tree at `6.0.0-alpha.1`](https://github.com/Adyen/adyen-android/tree/6.0.0-alpha.1) for the module `res/values/strings.xml` files.

## Adding new localizations

Add new locales in Xcode and Android Studio respectively. Provide a translation for all necessary keys.

List of locales available in the pinned `6.0.0-alpha.1` native SDKs (the SDKs remain the
authoritative source for the current set):

| Language               | Locale code | Fallback |
| ---------------------- | ----------- | :------: |
| Arabic - International | ar          |          |
| Bulgarian              | bg-BG       |          |
| Catalan                | ca-ES       |          |
| Chinese - Simplified   | zh-CN       |          |
| Chinese - Traditional  | zh-TW       |          |
| Croatian               | hr-HR       |          |
| Czech                  | cs-CZ       |          |
| Danish                 | da-DK       |          |
| Dutch                  | nl-NL       |          |
| English - US           | en-US       |    ✱     |
| Estonian               | et-EE       |          |
| Finnish                | fi-FI       |          |
| French                 | fr-FR       |          |
| German                 | de-DE       |          |
| Greek                  | el-GR       |          |
| Hungarian              | hu-HU       |          |
| Icelandic              | is-IS       |          |
| Italian                | it-IT       |          |
| Japanese               | ja-JP       |          |
| Korean                 | ko-KR       |          |
| Latvian                | lv-LV       |          |
| Lithuanian             | lt-LT       |          |
| Norwegian              | no-NO       |          |
| Polish                 | pl-PL       |          |
| Portuguese - Brazil    | pt-BR       |          |
| Portuguese - Portugal  | pt-PT       |          |
| Romanian               | ro-RO       |          |
| Russian                | ru-RU       |          |
| Slovak                 | sk-SK       |          |
| Slovenian              | sl-SI       |          |
| Spanish                | es-ES       |          |
| Swedish                | sv-SE       |          |
