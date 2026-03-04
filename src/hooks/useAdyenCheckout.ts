import { createContext, useContext } from 'react';
import type { PaymentMethodsResponse, Configuration } from '../core';
import { MISSING_CONTEXT_ERROR } from './constants';

/**
 * Shape of the AdyenCheckout context value.
 */
export interface AdyenCheckoutContextType {
  /** Start payment with Drop-in or any payment method available in `paymentMethods` collection. */
  start: (typeName: string) => void;

  /** Configuration object. */
  config: Configuration;

  /** Payment methods available for payment. */
  paymentMethods?: PaymentMethodsResponse;

  /** True if the checkout is ready to be used. */
  isReady: boolean;
}

export const AdyenCheckoutContext =
  createContext<AdyenCheckoutContextType | null>(null);

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
export const useAdyenCheckout = (): AdyenCheckoutContextType => {
  const context = useContext(AdyenCheckoutContext);
  if (context !== null) {
    return context;
  }
  throw new Error(MISSING_CONTEXT_ERROR);
};
