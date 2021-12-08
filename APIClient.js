
import { environment } from "./Configuration";
  
  export const fetchPaymentMethods = (configuration) => {
    let paymentMethodsRequest = new Request(environment.url + 'paymentMethods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': environment.apiKey
    },
    body: JSON.stringify({
      merchantAccount: configuration.merchantAccount,
      countryCode: configuration.countryCode,
      shopperLocale: configuration.shopperLocale,
      amount: configuration.amount
    })
   });
  
   return fetch(paymentMethodsRequest)
      .then(response => {
        console.log(response.headers);
        if (response.status === 200) {
          return response.json();
        } else {
          response.json().then( data => { console.log(data); } );
          throw new Error('Payment methods error ' + response.status);
        }
      })
  };
  
  export const fetchPayments = (paymentData) => {
    let paymentRequest = new Request(environment.url + 'payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': environment.apiKey
      },
      body: JSON.stringify(paymentData)
    });
  
   return fetch(paymentRequest)
    .then(response => {
      console.log(response.headers);
      if (response.status === 200) {
        return response.json();
      } else {
        response.json().then( data => { console.log(data); } );
        throw new Error('Payments error ' + response.status );
      }
    })
  };
  
  export const fetchPaymentDetails = (configuration, details, paymentData) => {
    let paymentDetailsRequest = new Request(environment.url + 'payments/details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': environment.apiKey
      },
      body: JSON.stringify({
        paymentData: paymentData,
        details: details,
        merchantAccount: configuration.merchantAccount
      })
    });
  
   return fetch(paymentDetailsRequest)
    .then(response => {
        console.log(response.headers);
      if (response.status === 200) {
        return response.json();
      } else {
        response.json().then( data => { console.log(data); } );
        throw new Error('Payment details error ' + response.status);
      }
    })
  };