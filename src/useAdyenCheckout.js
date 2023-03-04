// @ts-check

import { useContext } from 'react';
import { AdyenCheckoutContext } from './AdyenCheckoutContext';
import { MISSING_CONTEXT_ERROR } from './constants';

const useAdyenCheckout = () => {
  const context = useContext(AdyenCheckoutContext);
  if (context === undefined) {
    throw new Error(MISSING_CONTEXT_ERROR);
  }
  return context;
};

export { useAdyenCheckout };
