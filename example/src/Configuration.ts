import type { Environment } from '@adyen/react-native';
import { Platform, I18nManager } from 'react-native';
import secrets from '../secrets.json';

let locale = I18nManager.getConstants().localeIdentifier ?? 'en-US';
export const DEVICE_LOCALE = locale.replace('_', '-');

export const CHANNEL = Platform.select({
  ios: 'iOS',
  android: 'Android',
});

export const DEFAULT_CONFIGURATION = {
  countryCode: 'NL',
  currency: 'EUR',
  amount: 1000, // The amount value in minor units.
  merchantAccount: secrets.MERCHANT_ACCOUNT, // Or '{YOUR_MERCHANT_ACCOUNT}'
  merchantName: secrets.merchantName, // Or '{YOUR_MERCHANT_NAME}'
  shopperLocale: DEVICE_LOCALE,
  shopperReference: 'Checkout Shopper',
};

// For test purposes only! Do not call Adyen API from your mobile app on LIVE.
export const ENVIRONMENT = {
  environment: 'test' as Environment,
  apiKey: secrets.X_API_KEY, // Or '{YOUR_DEMO_SERVER_API_KEY}'
  url: 'https://checkout-test.adyen.com/v70/',
  publicKey: secrets.PUBLIC_KEY, // Or '{YOUR_PUBLIC_KEY}'
  clientKey: secrets.CLIENT_KEY, // Or '{YOUR_CLIENT_KEY}'
  returnUrl: 'myapp://payment', // Only used for iOS
  applepayMerchantID: secrets.APPLE_PAY_MERCHANT_ID_KEY, // Or '{YOUR_APPLE_MERCHANT_ID}'
};
