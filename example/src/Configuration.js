import { Platform } from 'react-native';

export const channel = Platform.select({
  ios: () => 'iOS',
  android: () => 'Android',
})();

export const defaultConfiguration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: {
    currency: 'EUR',
    value: 1000 // The amount value in minor units.
  },
  returnUrl: 'myapp://',
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  shopperLocale: 'en-US',
  dropin: {
    skipListWhenSinglePaymentMethod: true,
    // showPreselectedStoredPaymentMethod: false
  },
  card: {
    holderNameRequired: true,
    addressVisibility: `postalCode`
    // showStorePaymentField : false,
    // hideCvcStoredCard: true,
    // hideCvc: true,
  },
  applepay: {
    // merchantID: 'merchant.com.adyen.MY_MERCHANT_ID',
    // merchantName: 'MY_MERCHANT'
  },
  googlepay: {
  },
  style: {
    // TODO: add styling
  }
};

export const environment = {
  apiKey:
    '{YOUR_DEMO_SERVER_API_KEY}',
  url: 'https://checkout-test.adyen.com/v67/',
};
