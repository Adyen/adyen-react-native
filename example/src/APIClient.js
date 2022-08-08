import { environment, channel } from './Configuration';

const serverConfiguration = {
  channel: channel,
  shopperReference: 'Checkout Shopper',
  reference: 'React Native'
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

  return fetchFrom(environment.url + 'paymentMethods', body);
};

export const fetchPayments = (data, configuration) => {
  let body = {
    ...data,
    ...parseConfig(configuration),
    ...serverConfiguration,
    additionalData: { allow3DS2: true }
  };

  return fetchFrom(environment.url + 'payments', body);
};

export const fetchPaymentDetails = (data) => {
  return fetchFrom(environment.url + 'payments/details', data);
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
      'X-API-Key': environment.apiKey,
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
