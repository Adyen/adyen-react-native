import { createContext, useContext } from 'react';
import type { PaymentMethodsResponse } from '../core/types';
import type { Configuration } from '../core/configurations/Configuration';
import { MISSING_CONTEXT_ERROR } from '../core/constants';

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
export interface AdyenCheckoutContextType {
  /** Start payment with Drop-in or any payment method available in `paymentMethods` collection. */
  start: (typeName: string) => void;

  /** Configuration object. */
  config: Configuration;

  /** Payment methods available for payment. */
  paymentMethods?: PaymentMethodsResponse;
}

export const AdyenCheckoutContext =
  createContext<AdyenCheckoutContextType | null>(null);

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
export const useAdyenCheckout = (): AdyenCheckoutContextType => {
  const context = useContext(AdyenCheckoutContext);
  if (context != null) {
    return context;
  }
  throw new Error(MISSING_CONTEXT_ERROR);
};
