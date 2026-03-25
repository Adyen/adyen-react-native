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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppConfiguration } from '../settings/types';
import type { PaymentResponse } from '../api/types';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { AdyenComponent } from '@adyen/react-native';
import { isSuccess } from '../components/utilities/isSuccess';
import { RootStackParamList } from '../router/RootStackNavigator';

type AppContextType = {
  configuration: AppConfiguration;
  save: (config: AppConfiguration) => void;
  update: (partial: Partial<AppConfiguration>) => void;
  processResult: (
    result: PaymentResponse,
    nativeComponent: AdyenComponent
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

const storeKey = '@config_storage';

type AppContextProp = {
  configuration: AppConfiguration;
  onError: (error: Error) => void;
  navigationRef: NavigationContainerRef<RootStackParamList>;
};

const AppContextProvider = (props: PropsWithChildren<AppContextProp>) => {
  const [config, setConfig] = useState(props.configuration);
  const configRef = useRef(config);
  configRef.current = config;
  const { navigationRef } = props;

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

  const updateConfiguration = useCallback(
    async (partial: Partial<AppConfiguration>) => {
      const merged = { ...configRef.current, ...partial };
      await AsyncStorage.setItem(storeKey, JSON.stringify(merged));
      setConfig(merged);
    },
    []
  );

  const processResult = useCallback(
    (result: PaymentResponse, nativeComponent: AdyenComponent) => {
      const success = isSuccess(result.resultCode);
      nativeComponent.hide(success);
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
      save: saveConfiguration,
      update: updateConfiguration,
      processResult,
      navigateToRoot,
      navigateToSettings,
    }),
    [
      config,
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
