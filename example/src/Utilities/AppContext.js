// @ts-check

import React, { useContext, useState, useMemo, createContext } from 'react';
import ApiClient from './APIClient';

export const AppContext = createContext({
  configuration: undefined,
  paymentMethods: undefined,
  refreshPaymentMethods: (configuration) => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

const AppContextProvider = (props) => {
  const [config, setConfig] = useState(props.configuration);
  const [paymentMethods, setPaymentMethods] = useState(undefined);

  const refresh = async (newConfig = config) => {
    try {
      console.debug(`Refreshing config: ${JSON.stringify(newConfig)}`);
      const response = await ApiClient.paymentMethods(newConfig);
      setPaymentMethods(response);
      setConfig(newConfig);
    } catch (error) {
      props.onError(error);
    }
  };

  const appState = useMemo(
    () => ({
      configuration: config,
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
