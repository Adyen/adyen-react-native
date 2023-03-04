// @ts-check

import { useContext } from 'react';
import { AdyenCheckoutContext } from './AdyenCheckoutContext';
import { MISSING_CONTEXT_ERROR } from './constants';

/**
 * @callback StartFunction
 * @param {string} typeName - "dropin" or `type` name of a selected payment method.
 * @returns {void}
 *
 * @typedef {Object} AdyenCheckoutContextState
 * @property {StartFunction} start -
 * @property {import('./AdyenNativeModules').PaymentMethodsResponse} paymentMethods - JSON response from Adyen API `\paymentMethods`
 * @property {any} config - collection of all nececery configurations
 */

/**
 * Returns AdyenCheckout context.
 * This context allows you to initiate payment with Drop-in or any payment method avaiallbe in `paymentMethods` collection.
 * @returns {AdyenCheckoutContextState}
 */
const useAdyenCheckout = () => {
  const context = useContext(AdyenCheckoutContext);
  if (context === undefined) {
    throw new Error(MISSING_CONTEXT_ERROR);
  }
  // @ts-ignore
  return context;
};

export { useAdyenCheckout };
