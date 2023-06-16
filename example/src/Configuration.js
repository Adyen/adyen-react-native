import { Platform, NativeModules } from 'react-native';
export const DEVICE_LOCALE = (
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager.settings.AppleLocale ||
      NativeModules.SettingsManager.settings.AppleLanguages[0] //iOS 13
    : NativeModules.I18nManager.localeIdentifier
).replace('_', '-');

export const CHANNEL = Platform.select({
  ios: () => 'iOS',
  android: () => 'Android',
})();

export const DEFAULT_CONFIGURATION = {
  countryCode: 'NL',
  currency: 'EUR',
  amount: 1000, // The amount value in minor units.
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  merchantName: 'MyStore',
  applepayMerchantID: '{YOUR_APPLE_MERCHANT_ID}',
  shopperLocale: DEVICE_LOCALE,
  shopperReference: 'Checkout Shopper',
};

// For test purposes only! Do not call Adyen API from your mobile app on LIVE.
export const ENVIRONMENT = {
  /** @type {import('@adyen/react-native').Environment} */
  environment: 'test',
  apiKey: '{YOUR_DEMO_SERVER_API_KEY}',
  url: 'https://checkout-test.adyen.com/v70/',
  publicKey: '{YOUR_PUBLIC_KEY}',
  clientKey: '{YOUR_CLIENT_KEY}',
  returnUrl: 'myapp://payment', // Only used for iOS
};
