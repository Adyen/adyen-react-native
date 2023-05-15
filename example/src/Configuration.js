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
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  returnUrl: 'myapp://payment', // Only used for iOS,
  shopperReference: 'Checkout Shopper',
  shopperLocale: DEVICE_LOCALE,
  countryCode: 'NL',
  amount: {
    value: 1000, // The amount value in minor units.
    currency: 'EUR',
  },
  dropin: {
    skipListWhenSinglePaymentMethod: true,
    // showPreselectedStoredPaymentMethod: false
  },
  card: {
    holderNameRequired: true,
    // addressVisibility: 'full',
    // showStorePaymentField: true,
    // hideCvcStoredCard: false,
    // hideCvc: false,
    // kcpVisibility: 'show',
    // socialSecurity: 'show',
    // supported: [],
  },
  applepay: {
    merchantID: '{YOUR_APPLE_MERCHANT_ID}',
    merchantName: '{YOUR_MERCHANT_NAME}',
    //allowOnboarding: true
  },
  googlepay: {
    merchantAccount: '{YOUR_GOOGLE_MERCHANT_ACCOUNT}',
    allowedCardNetworks: ['AMEX', 'MASTERCARD', 'VISA'],
    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    totalPriceStatus: 'FINAL',
    allowPrepaidCards: true,
    billingAddressRequired: true,
    emailRequired: true,
    shippingAddressRequired: true,
    existingPaymentMethodRequired: false,
    googlePayEnvironment: 3, // WalletConstants.ENVIRONMENT_TEST
  },
};

// For test purposes only! Do not call Adyen API from your mobile app on LIVE.
export const ENVIRONMENT = {
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  apiKey: '{YOUR_DEMO_SERVER_API_KEY}',
  url: 'https://checkout-test.adyen.com/v67/',
  publicKey: '{YOUR_PUBLIC_KEY}',
};
