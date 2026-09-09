import type { PaymentMethodsResponse } from '../../core';

export const checkPaymentMethodsResponse = (
  paymentMethodsResponse: PaymentMethodsResponse | undefined
) => {
  if (paymentMethodsResponse === undefined) {
    throw new Error(
      'paymentMethodsResponse is undefined. Make sure to make POST `paymentMethods` or call `conext.startSession()`' +
        'Try JSON.parse("{...}") your paymentMethodsResponse.'
    );
  }

  if (typeof paymentMethodsResponse === 'string') {
    throw new TypeError(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but a string was provided).' +
        'Try JSON.parse("{...}") your paymentMethodsResponse.'
    );
  }

  if (Array.isArray(paymentMethodsResponse)) {
    throw new TypeError(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but an array was provided).' +
        'Please check you are passing the whole response.'
    );
  }

  if (
    !paymentMethodsResponse?.paymentMethods?.length &&
    !paymentMethodsResponse?.storedPaymentMethods?.length
  ) {
    console.warn(
      'paymentMethodsResponse was provided but no payment methods were found.'
    );
  }

  return paymentMethodsResponse;
};
