import { useContext } from 'react';
import { AdyenCheckoutContext } from './AdyenCheckoutContext';

const useAdyenCheckout = () => {
  const context = useContext(AdyenCheckoutContext);
  if (context === undefined) {
    throw new Error('useAdyenCheckout must be used within a AdyenCheckoutProvider');
  }
  return context;
};

export { useAdyenCheckout };