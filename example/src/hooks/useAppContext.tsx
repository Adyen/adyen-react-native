import {
  useContext,
  useState,
  useMemo,
  createContext,
  useEffect,
  type PropsWithChildren,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PaymentConfiguration } from '../api/types';

type AppContextType = {
  configuration: PaymentConfiguration;
  save: (config: PaymentConfiguration) => void;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

const storeKey = '@config_storage';

type AppContextProp = {
  configuration: PaymentConfiguration;
  onError: (error: Error) => void;
};

const AppContextProvider = (props: PropsWithChildren<AppContextProp>) => {
  const [config, setConfig] = useState(props.configuration);

  useEffect(() => {
    AsyncStorage.getItem(storeKey)
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value);
          setConfig(parsed);
        }
      })
      .catch(props.onError);
  }, [props.onError]);

  const saveConfiguration = useCallback(
    async (newConfig = config) => {
      await AsyncStorage.setItem(storeKey, JSON.stringify(newConfig));
      setConfig(newConfig);
    },
    [config]
  );

  const appState = useMemo<AppContextType>(
    () => ({
      configuration: config,
      save: saveConfiguration,
    }),
    [config, saveConfiguration]
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
