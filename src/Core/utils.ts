import {
  PaymentMethod,
  PaymentMethodsResponse,
  StoredPaymentMethod,
} from './types';

export const processPaymentMethods = (
  paymentMethods: PaymentMethod[],
  { allowPaymentMethods = [], removePaymentMethods = [] }
): PaymentMethod[] => {
  if (!paymentMethods) return [];

  return paymentMethods
    .filter(filterAllowedPaymentMethods, allowPaymentMethods)
    .filter(filterRemovedPaymentMethods, removePaymentMethods);
};

export const processStoredPaymentMethods = (
  storedPaymentMethods: StoredPaymentMethod[],
  { allowPaymentMethods = [], removePaymentMethods = [] }
): PaymentMethod[] => {
  if (!storedPaymentMethods) return [];

  return storedPaymentMethods
    .filter(filterSupportedStoredPaymentMethods) // only display supported stored payment methods
    .filter(filterAllowedPaymentMethods, allowPaymentMethods)
    .filter(filterRemovedPaymentMethods, removePaymentMethods)
    .filter(filterEcomStoredPaymentMethods); // Only accept Ecommerce shopper interactions
};

export const checkPaymentMethodsResponse = (
  response: PaymentMethodsResponse
) => {
  if (typeof response === 'string') {
    throw new Error(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but a string was provided).' +
        'Try JSON.parse("{...}") your paymentMethodsResponse.'
    );
  }

  if (response instanceof Array) {
    throw new Error(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but an array was provided).' +
        'Please check you are passing the whole response.'
    );
  }

  if (
    response &&
    !response?.paymentMethods?.length &&
    !response?.storedPaymentMethods?.length
  ) {
    console.warn(
      'paymentMethodsResponse was provided but no payment methods were found.'
    );
  }
};

export function filterAllowedPaymentMethods(pm: any) {
  // @ts-ignore
  return !this.length || this.indexOf(pm.type) > -1;
}

export function filterRemovedPaymentMethods(pm: any) {
  // @ts-ignore
  return !this.length || this.indexOf(pm.type) < 0;
}

export function filterEcomStoredPaymentMethods(pm: any) {
  return (
    !!pm &&
    !!pm.supportedShopperInteractions &&
    pm.supportedShopperInteractions.includes('Ecommerce')
  );
}

const supportedStoredPaymentMethods = ['scheme', 'blik', 'twint', 'ach'];

export function filterSupportedStoredPaymentMethods(pm: any) {
  return !!pm && !!pm.type && supportedStoredPaymentMethods.includes(pm.type);
}
