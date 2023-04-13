import {
  ENVIRONMENT,
  CHANNEL,
  DEVICE_LOCALE,
  MERCHANT_ACCOUNT,
} from '../Configuration';
import { Configuration, PaymentMethodData } from '@adyen/react-native';

class ApiClient {
  static payments(data: PaymentMethodData, config: Configuration) {
    const body = {
      ...data,
      amount: config.amount,
      reference: serverConfiguration.reference,
      channel: serverConfiguration.channel,
      merchantAccount: MERCHANT_ACCOUNT,
      additionalData: { allow3DS2: true },
      lineItems: [
        {
          quantity: '1',
          amountExcludingTax: '331',
          taxPercentage: '2100',
          description: 'Shoes',
          id: 'Item #1',
          taxAmount: '69',
          amountIncludingTax: '400',
          productUrl: 'URL_TO_PURCHASED_ITEM',
          imageUrl: 'URL_TO_PICTURE_OF_PURCHASED_ITEM',
        },
        {
          quantity: '2',
          amountExcludingTax: '248',
          taxPercentage: '2100',
          description: 'Socks',
          id: 'Item #2',
          taxAmount: '52',
          amountIncludingTax: '300',
          productUrl: 'URL_TO_PURCHASED_ITEM',
          imageUrl: 'URL_TO_PICTURE_OF_PURCHASED_ITEM',
        },
      ],
    };

    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments', body);
  }

  static paymentDetails = (data: PaymentMethodData) => {
    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments/details', data);
  };

  static paymentMethods = () => {
    const body = {
      merchantAccount: MERCHANT_ACCOUNT,
    };

    console.log('Fetching payment methods');
    return ApiClient.makeRequest(ENVIRONMENT.url + 'paymentMethods', body);
  };

  /** @private */
  static makeRequest = async (url: string, body: unknown) => {
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ENVIRONMENT.apiKey,
      },
      body: JSON.stringify(body),
    });

    const response = await fetch(request);
    const payload = await response.json();
    if (response.ok) {
      return payload;
    }
    throw new Error(`Network Error ${response.status}:
          ${payload.message || 'Unknown error'}`);
  };
}

export default ApiClient;

const serverConfiguration = {
  channel: CHANNEL,
  shopperReference: 'Checkout Shopper',
  reference: 'React Native',
  shopperLocale: DEVICE_LOCALE,
};
