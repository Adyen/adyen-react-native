// @ts-check

import { useContext } from 'react';
import {
  AdyenCheckoutContext,
  AdyenCheckoutContextType,
} from './AdyenCheckoutContext';
import { MISSING_CONTEXT_ERROR } from './Core/constants';

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
const useAdyenCheckout = (): AdyenCheckoutContextType => {
  const context = useContext(AdyenCheckoutContext);
  if (context != null) {
    return context!;
  }
  throw new Error(MISSING_CONTEXT_ERROR);
};

export { useAdyenCheckout };
