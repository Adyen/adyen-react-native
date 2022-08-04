import { environment, channel } from './Configuration';

const serverConfiguration = {
  channel: channel,
  shopperReference: 'Checkout Shopper',
  reference: 'React Native'
};

const parseConfig = (configuration) => {
    return {
      merchantAccount: configuration.merchantAccount,
      countryCode: configuration.countryCode,
      shopperLocale: configuration.shopperLocale,
      amount: configuration.amount
  }
};

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
  let paymentMethodsRequest = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': environment.apiKey,
    },
    body: JSON.stringify(body),
  });

  return fetch(paymentMethodsRequest).then((response) => {
    if (response.status === 200) {
      return response.json();
    } else {
      return response.json().then((json) => {
        throw new Error(
          'Network error ' + response.status + ': \n' + json.message ||
            'Unknown error'
        );
      });
    }
  });
};
