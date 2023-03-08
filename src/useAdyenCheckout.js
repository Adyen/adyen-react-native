// @ts-check

import { useContext } from 'react';
import { AdyenCheckoutContext } from './AdyenCheckoutContext';
import { MISSING_CONTEXT_ERROR } from './constants';

/**
 * @callback StartFunction Initiate payment flow for selected payment method.
 * @param {string} typeName Payment method name. Use "dropin" or `type` name of a selected payment method.
 * @returns {void}
 /*

 /**
 * @typedef {Object} AdyenCheckoutContextState State of AdyenCheckout context.
 * @property {StartFunction} start
 * @property {import('./AdyenNativeModules').PaymentMethodsResponse} paymentMethods
 * @property {any} config collection of all necessary configurations
 */

/**
 * @callback GetAdyenCheckoutContextFunction
 * @returns {AdyenCheckoutContextState}
 */

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 * @type {GetAdyenCheckoutContextFunction} */
const useAdyenCheckout = () => {
  const context = useContext(AdyenCheckoutContext);
  if (context === undefined) {
    throw new Error(MISSING_CONTEXT_ERROR);
  }
  // @ts-ignore
  return context;
};

export { useAdyenCheckout };
