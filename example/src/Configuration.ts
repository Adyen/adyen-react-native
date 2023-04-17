import { Platform, NativeModules } from 'react-native';
import { Configuration } from '@adyen/react-native';

export const DEVICE_LOCALE = (
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager.settings.AppleLocale ||
      NativeModules.SettingsManager.settings.AppleLanguages[0] //iOS 13
    : NativeModules.I18nManager.localeIdentifier
).replace('_', '-');

export const CHANNEL = Platform.OS === 'android' ? 'Android' : 'iOS';
export const MERCHANT_ACCOUNT = '{YOUR_MERCHANT_ACCOUNT}';

export const DEFAULT_CONFIGURATION: Configuration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  shopperLocale: 'nl-NL',
  countryCode: 'NL',
  amount: {
    currency: 'EUR',
    value: 1000, // The amount value in minor units.
  },
  returnUrl: 'myapp://payment', // Only used for iOS
  dropin: {
    skipListWhenSinglePaymentMethod: true,
    // showPreselectedStoredPaymentMethod: false
  },
  card: {
    holderNameRequired: true,
    addressVisibility: 'postalCode',
    // showStorePaymentField : false,
    // hideCvcStoredCard: true,
    // hideCvc: true,
  },
  applepay: {
    merchantID: '{YOUR_APPLE_MERCHANT_ID}',
    merchantName: '{YOUR_MERCHANT_NAME}',
    //allowOnboarding: true
  },
  googlepay: {},
};

// For test purposes only! Do not call Adyen API from your mobile app on LIVE.
export const ENVIRONMENT = {
  apiKey: '{YOUR_DEMO_SERVER_API_KEY}',
  url: 'https://checkout-test.adyen.com/v67/',
  publicKey: '{YOUR_PUBLIC_KEY}',
};
