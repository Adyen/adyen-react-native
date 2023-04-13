import React, { useContext, useState, useCallback, ReactNode } from 'react';
import ApiClient from './APIClient';
import { DEFAULT_CONFIGURATION } from '../Configuration';
import { Configuration, PaymentMethodsResponse } from '@adyen/react-native';

export const PaymentMethodsContext = React.createContext<{
  config: Configuration;
  paymentMethods: PaymentMethodsResponse | undefined;
  refreshPaymentMethods: (config?: Configuration) => void;
}>({
  config: DEFAULT_CONFIGURATION,
  paymentMethods: undefined,
  refreshPaymentMethods: () => undefined,
});

export const usePaymentMethods = () => {
  const context = useContext(PaymentMethodsContext);
  if (context === undefined) {
    throw new Error(
      'usePaymentMethods must be used within a PaymentMethodsContext',
    );
  }
  return context;
};

type Props = {
  children: ReactNode;
  onError: (error: any) => void;
};

const PaymentMethodsProvider = (props: Props) => {
  const [config, setConfig] = useState(DEFAULT_CONFIGURATION);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodsResponse | undefined
  >(undefined);

  const refresh = useCallback(
    async (newConfig?: Configuration) => {
      console.log('refreshing pms');
      try {
        const newPaymentMethods = await ApiClient.paymentMethods();
        setPaymentMethods(newPaymentMethods);
        if (newConfig) {
          setConfig(newConfig);
        }
      } catch (error) {
        props.onError(error);
      }
    },
    [props],
  );

  return (
    <PaymentMethodsContext.Provider
      value={{
        config: config,
        paymentMethods: paymentMethods,
        refreshPaymentMethods: refresh,
      }}>
      {props.children}
    </PaymentMethodsContext.Provider>
  );
};

export default PaymentMethodsProvider;
