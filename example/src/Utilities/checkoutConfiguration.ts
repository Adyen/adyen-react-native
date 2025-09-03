import type { Configuration } from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';

export type PaymentConfiguration = {
  shopperLocale: string;
  amount: number;
  currency: string;
  countryCode: string;
  merchantName?: any;
  merchantAccount: string;
  shopperReference: string;
};

export const checkoutConfiguration = (config: PaymentConfiguration) => {
  const configuration: Configuration = {
    clientKey: ENVIRONMENT.clientKey,
    environment: ENVIRONMENT.environment,
    returnUrl: ENVIRONMENT.returnUrl,
    locale: config.shopperLocale,
    amount: {
      value: config.amount,
      currency: config.currency,
    },
    countryCode: config.countryCode,
    applepay: {
      merchantID: ENVIRONMENT.applepayMerchantID,
      merchantName: config.merchantName,
    },
  };
  return configuration;
};
