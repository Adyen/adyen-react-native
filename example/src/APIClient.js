
import { environment } from "./Configuration";

export const fetchPaymentMethods = (configuration) => {
    let body = {
      merchantAccount: configuration.merchantAccount,
      countryCode: configuration.countryCode,
      shopperLocale: configuration.shopperLocale,
      amount: configuration.amount,
      channel: configuration.channel
    };

    return fetchFrom(environment.url + 'paymentMethods', body)
};

export const fetchPayments = (data) => {
  return fetchFrom(environment.url + 'payments', data);
};

export const fetchPaymentDetails = (data) => {
  return fetchFrom(environment.url + 'payments/details', data);
};

const fetchFrom = (url, body) => {
  let paymentMethodsRequest = new Request(url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': environment.apiKey
      },
      body: JSON.stringify(body)
    });

    return fetch(paymentMethodsRequest)
      .then(response => {
        console.log(response.headers);
        if (response.status === 200) {
          return response.json();
        } else {
          response.json().then( data => { console.log(data); } );
          throw new Error('Network error ' + url + ': \n' + response.status);
        }
      })
};
