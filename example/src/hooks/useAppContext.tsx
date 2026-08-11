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
import type { PaymentResultHandler } from '@adyen/react-native';
import type { ApiService } from '../api/ApiService';
import type { ConfigProvider } from '../config/ConfigProvider';
import { RootStackParamList } from '../router/RootStackNavigator';

type AppContextType = {
  configuration: AppConfiguration;
  apiClient: ApiService;
  save: (config: AppConfiguration) => void;
  update: (partial: Partial<AppConfiguration>) => void;
  processResult: (
    result: PaymentResponse,
    nativeComponent: PaymentResultHandler
  ) => void;
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
  apiClient: ApiService;
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

  const processResult = useCallback(
    (result: PaymentResponse, nativeComponent: PaymentResultHandler) => {
      nativeComponent.completion(result.resultCode);
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
      apiClient: props.apiClient,
      save: saveConfiguration,
      update: updateConfiguration,
      processResult,
      navigateToRoot,
      navigateToSettings,
    }),
    [
      config,
      props.apiClient,
      saveConfiguration,
      updateConfiguration,
      processResult,
      navigateToRoot,
      navigateToSettings,
    ]
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
