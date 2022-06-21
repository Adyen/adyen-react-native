import { Platform } from 'react-native';

const channel = Platform.select({
  ios: () => 'iOS',
  android: () => 'Android',
})();

export const defaultConfiguration = {
  environment: 'test',
  channel: channel,
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: {
    currency: 'EUR',
    value: 1000 // The amount information for the transaction (in minor units). For BIN or card verification requests, set amount to 0 (zero).
  },
  reference: 'React Native',
  returnUrl: 'myapp://',
  shopperReference: 'Checkout Shopper',
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  shopperLocale: 'en-US',
  additionalData: { allow3DS2: true },
  dropin: {
    skipListWhenSinglePaymentMethod: false,
    showPreselectedStoredPaymentMethod: true
  },
  card: {
    holderNameRequired: false,
    showStorePaymentField : true,
    hideCvcStoredCard: true
  },
  bcmc: { },
  applepay: {
    merchantID: ''
  },
  style: {
    tintColor: ''
  }
};

export const environment = {
  apiKey:
    '{YOUR_DEMO_SERVER_API_KEY}',
  url: 'https://checkout-test.adyen.com/v67/',
};
