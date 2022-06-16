import { environment } from './Configuration';

export const fetchPaymentMethods = (configuration) => {
  let body = {
    merchantAccount: configuration.merchantAccount,
    countryCode: configuration.countryCode,
    shopperLocale: configuration.shopperLocale,
    amount: configuration.amount,
    channel: configuration.channel,
    shopperReference: configuration.shopperReference
  };

  return fetchFrom(environment.url + 'paymentMethods', body);
};

export const fetchPayments = (data) => {
  return fetchFrom(environment.url + 'payments', data);
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
