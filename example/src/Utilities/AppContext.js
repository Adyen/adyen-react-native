// @ts-check

import React, { useContext, useState, useMemo, createContext } from 'react';
import ApiClient from './APIClient';
import { DEFAULT_CONFIGURATION } from '../Configuration';

export const AppContext = createContext({
  config: DEFAULT_CONFIGURATION,
  paymentMethods: undefined,
  refreshPaymentMethods: (config) => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

const AppContextProvider = (props) => {
  const [config, setConfig] = useState(DEFAULT_CONFIGURATION);
  const [paymentMethods, setPaymentMethods] = useState(undefined);

  const refresh = async (config) => {
    try {
      const paymentMethods = await ApiClient.paymentMethods(config);
      setPaymentMethods(paymentMethods);
      setConfig(config);
    } catch (error) {
      props.onError(error);
    }
  };

  const appState = useMemo(
    () => ({
      config: config,
      paymentMethods: paymentMethods,
      refreshPaymentMethods: refresh,
    }),
    [config, paymentMethods]
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
