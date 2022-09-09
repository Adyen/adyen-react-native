import { ENVIRONMENT, CHANNEL, DEVICE_LOCALE } from './Configuration';

const serverConfiguration = {
  channel: CHANNEL,
  shopperReference: 'Checkout Shopper',
  reference: 'React Native',
  shopperLocale: DEVICE_LOCALE
};

const parseConfig = ({ merchantAccount, countryCode, shopperLocale, amount }) => ({
  merchantAccount,
  countryCode,
  shopperLocale,
  amount
});

export const fetchPaymentMethods = (configuration) => {
  let body = {
    ...parseConfig(configuration),
    ...serverConfiguration
  };

  return fetchFrom(ENVIRONMENT.url + 'paymentMethods', body);
};

export const fetchPayments = (data, configuration) => {
  let body = {
    ...data,
    ...parseConfig(configuration),
    ...serverConfiguration,
    additionalData: { allow3DS2: true },
    lineItems: [
      {
        quantity: "1",
        amountExcludingTax: "331",
        taxPercentage: "2100",
        description: "Shoes",
        id: "Item #1",
        taxAmount: "69",
        amountIncludingTax: "400",
        productUrl: "URL_TO_PURCHASED_ITEM",
        imageUrl: "URL_TO_PICTURE_OF_PURCHASED_ITEM"
      },
      {
        quantity: "2",
        amountExcludingTax: "248",
        taxPercentage: "2100",
        description: "Socks",
        id: "Item #2",
        taxAmount: "52",
        amountIncludingTax: "300",
        productUrl: "URL_TO_PURCHASED_ITEM",
        imageUrl: "URL_TO_PICTURE_OF_PURCHASED_ITEM"
      }
    ]
  };

  return fetchFrom(ENVIRONMENT.url + 'payments', body);
};

export const fetchPaymentDetails = (data) => {
  return fetchFrom(ENVIRONMENT.url + 'payments/details', data);
};

export const isSuccess = (result) => {
  const code = result.resultCode;
  return code === 'Authorised' || code === 'Received' || code === 'Pending';
};

const fetchFrom = (url, body) => {
  let request = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': ENVIRONMENT.apiKey,
    },
    body: JSON.stringify(body),
  });

  return fetch(request).then((response) => {
    return response.json().then(payload => {
      if (response.ok) return payload;
      throw new Error(`Network Error ${response.status}:
        ${payload.message || 'Unknown error'}`);
    });
  });
};
