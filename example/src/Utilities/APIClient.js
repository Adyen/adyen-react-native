// @ts-check

import { LogBox } from 'react-native';
import { ENVIRONMENT, CHANNEL } from '../Configuration';

LogBox.ignoreLogs(['Require cycle:']);

class ApiClient {
  static payments(data, configuration) {
    console.debug(JSON.stringify(data));
    const body = {
      ...data,
      ...parseConfig(configuration),
      ...parseAmount(configuration, data),
      ...serverConfiguration,
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

  static paymentDetails = (data) => {
    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments/details', data);
  };

  static paymentMethods = (configuration) => {
    const body = {
      ...parseConfig(configuration),
      ...parseAmount(configuration),
      ...serverConfiguration,
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'paymentMethods', body);
  };

  /** @private */
  static makeRequest = async (url, body) => {
    const bodyJSON = JSON.stringify(body);
    console.debug(`Request to: ${url}`);
    console.debug(bodyJSON);
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ENVIRONMENT.apiKey,
      },
      body: bodyJSON,
    });

    const response = await fetch(request);
    const payload = await response.json();
    if (response.ok) return payload;
    throw new Error(`Network Error ${response.status}:
          ${payload.message || 'Unknown error'}`);
  };
}

export default ApiClient;

const serverConfiguration = {
  channel: CHANNEL,
  reference: 'React Native',
  merchantAccount: ENVIRONMENT.merchantAccount,
};

const parseAmount = (configuration, data) => ({
  amount: data?.amount ?? {
    value: configuration.amount?.value,
    currency: configuration.amount?.currency,
  },
});

const parseConfig = ({ countryCode, shopperReference, shopperLocale }) => ({
  countryCode,
  shopperReference,
  shopperLocale,
});
