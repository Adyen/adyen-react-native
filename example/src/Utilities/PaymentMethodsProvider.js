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
  const [config, setConfig] = useState(DEFAULT_CONFIGURATION);
  const [paymentMethods, setPaymentMethods] = useState(undefined);

  const refresh = useCallback(
    async (newConfig = config) => {
      console.log('refreshing pms');
      try {
        const paymentMethods = await ApiClient.paymentMethods(newConfig);
        setPaymentMethods(paymentMethods);
        setConfig(config);
      } catch (error) {
        props.onError(error);
      }
    },
    [config, paymentMethods]
  );

  return (
    <PaymentMethodsContext.Provider
      value={{
        config: config,
        paymentMethods: paymentMethods,
        refreshPaymentMethods: refresh,
      }}
    >
      {props.children}
    </PaymentMethodsContext.Provider>
  );
};

export default PaymentMethodsProvider;
