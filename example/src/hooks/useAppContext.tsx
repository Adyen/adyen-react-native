import {
  useContext,
  useState,
  useMemo,
  useRef,
  createContext,
  useEffect,
  type PropsWithChildren,
  useCallback,
} from 'react';
import type { AppConfiguration } from '../settings/types';
import type { PaymentResponse } from '../api/types';
import type { NavigationContainerRef } from '@react-navigation/native';

import type { AdvancedApiService, SessionsApiService } from '../api/ApiService';
import type { ConfigProvider } from '../config/ConfigProvider';
import { RootStackParamList } from '../router/RootStackNavigator';

type AppContextType = {
  configuration: AppConfiguration;
  sessionsApi: SessionsApiService;
  advancedApi: AdvancedApiService;
  save: (config: AppConfiguration) => void;
  update: (partial: Partial<AppConfiguration>) => void;
  navigateToResults: (result: PaymentResponse) => void;
  navigateToRoot: () => void;
  navigateToSettings: () => void;
};

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

type AppContextProp = {
  configProvider: ConfigProvider;
  sessionsApi: SessionsApiService;
  advancedApi: AdvancedApiService;
  onError: (error: Error) => void;
  navigationRef: NavigationContainerRef<RootStackParamList>;
};

const AppContextProvider = (props: PropsWithChildren<AppContextProp>) => {
  const [config, setConfig] = useState(
    props.configProvider.initialConfiguration
  );
  const configRef = useRef(config);
  configRef.current = config;
  const { navigationRef } = props;

  useEffect(() => {
    props.configProvider
      .loadConfiguration()
      .then(setConfig)
      .catch(props.onError);
  }, [props.configProvider, props.onError]);

  const saveConfiguration = useCallback(
    async (newConfig = config) => {
      await props.configProvider.saveConfiguration(newConfig);
      setConfig(newConfig);
    },
    [config, props.configProvider]
  );

  const updateConfiguration = useCallback(
    async (partial: Partial<AppConfiguration>) => {
      await props.configProvider.updateConfiguration(partial);
      const merged = { ...configRef.current, ...partial };
      setConfig(merged);
    },
    [props.configProvider]
  );

  const navigateToResults = useCallback(
    (result: PaymentResponse) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Result', { resultCode: result.resultCode });
      }
    },
    [navigationRef]
  );

  const navigateToRoot = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'HomeStack', state: { routes: [{ name: 'Home' }] } }],
      });
    }
  }, [navigationRef]);

  const navigateToSettings = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Settings');
    }
  }, [navigationRef]);

  const appState = useMemo<AppContextType>(
    () => ({
      configuration: config,
      sessionsApi: props.sessionsApi,
      advancedApi: props.advancedApi,
      save: saveConfiguration,
      update: updateConfiguration,
      navigateToResults,
      navigateToRoot,
      navigateToSettings,
    }),
    [
      config,
      props.sessionsApi,
      props.advancedApi,
      saveConfiguration,
      updateConfiguration,
      navigateToResults,
      navigateToRoot,
      navigateToSettings,
    ]
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
