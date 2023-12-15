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
      ...paymentConfiguration
    };

    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments', body);
  }

  static paymentDetails = (data) => {
    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments/details', data);
  };

  static requestSssion = (configuration) => {
    const body = {
      ...parseConfig(configuration),
      ...parseAmount(configuration),
      ...serverConfiguration,
      ...paymentConfiguration
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'sessions', body);
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
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ENVIRONMENT.apiKey,
      },
      body: bodyJSON,
    });

    const response = await fetch(request);
    const pspReference = response.headers.get("pspreference");
    console.debug(`PSP Reference - ${pspReference}`);
    const payload = await response.json();
    if (response.ok) return payload;
    console.warn(`Error - ${JSON.stringify(payload, null, ' ')}`);
    throw new Error(`Network Error ${response.status}:
          ${payload.message || 'Unknown error'}`);
  };
}

export default ApiClient;

const serverConfiguration = {
  channel: CHANNEL,
  reference: 'React Native',
};

const paymentConfiguration = {
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
  recurringProcessingModel: 'CardOnFile'
};

const parseAmount = (configuration, data) => ({
  amount: data?.amount ?? {
    value: configuration.amount,
    currency: configuration.currency,
  },
});

const parseConfig = ({
  merchantAccount,
  countryCode,
  shopperReference,
  shopperLocale,
}) => ({
  merchantAccount,
  countryCode,
  shopperReference,
  shopperLocale: shopperLocale,
});
