import type { Environment } from '@adyen/react-native';
import { Platform, I18nManager } from 'react-native';
import {
  merchantAccount,
  demoServerApiKey,
  publicKey,
  clientKey,
  appleMerchantId,
} from '../secrets.json';

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
  merchantAccount: merchantAccount,
  shopperLocale: DEVICE_LOCALE,
  shopperReference: 'Checkout Shopper',
};

// For test purposes only! Do not call Adyen API from your mobile app on LIVE.
export const ENVIRONMENT = {
  environment: 'test' as Environment,
  apiKey: demoServerApiKey,
  url: 'https://checkout-test.adyen.com/v70/',
  publicKey: publicKey,
  clientKey: clientKey,
  returnUrl: 'myapp://payment', // **WARNING** Not used for Android DropIn.
  applepayMerchantID: appleMerchantId,
};
