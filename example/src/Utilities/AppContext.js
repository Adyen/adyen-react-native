// @ts-check

import React, {
  useContext,
  useState,
  useMemo,
  createContext,
  useEffect,
} from 'react';
import ApiClient from './APIClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext({
  configuration: undefined,
  paymentMethods: undefined,
  refreshPaymentMethods: async (configuration) => {},
});

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

const storeKey = '@config_storage';

const AppContextProvider = (props) => {
  const [config, setConfig] = useState(props.configuration);
  const [paymentMethods, setPaymentMethods] = useState(undefined);

  useEffect(() => {
    AsyncStorage.getItem(storeKey)
      .then((value) => {
        if (value) {
          console.debug(`Stored config: ${value}`);
          const parsed = JSON.parse(value);
          setConfig(parsed);
        }
      })
      .catch(props.onError);
  }, []);

  const refresh = async (newConfig = config) => {
    const response = await ApiClient.paymentMethods(newConfig);
    await AsyncStorage.setItem(storeKey, JSON.stringify(newConfig));
    setPaymentMethods(response);
    setConfig(newConfig);
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
