import React, { useContext, useState, useCallback } from 'react';
import ApiClient from './APIClient';
import { DEFAULT_CONFIGURATION } from '../Configuration';

export const PaymentMethodsContext = React.createContext();

export const usePaymentMethods = () => {
  const context = useContext(PaymentMethodsContext);
  if (context === undefined) {
    throw new Error(
      'usePaymentMethods must be used within a PaymentMethodsContext'
    );
  }
  return context;
};

const PaymentMethodsProvider = (props) => {
  const [state, setState] = useState({
    config: DEFAULT_CONFIGURATION,
    paymentMethods: undefined,
  });

  const refresh = useCallback(
    async (newConfig = state.config) => {
      console.log('refreshing pms');
      try {
        const paymentMethods = await ApiClient.paymentMethods(newConfig);
        setState({
          config: newConfig,
          paymentMethods: paymentMethods,
        });
      } catch (error) {
        props.onError(error);
      }
    },
    [state]
  );

  return (
    <PaymentMethodsContext.Provider
      value={{
        config: state.config,
        paymentMethods: state.paymentMethods,
        refreshPaymentMethods: refresh,
      }}
    >
      {props.children}
    </PaymentMethodsContext.Provider>
  );
};

export default PaymentMethodsProvider;
