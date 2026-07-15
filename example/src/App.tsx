/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import { Alert, SafeAreaView, useColorScheme } from 'react-native';
import type { ConfigProvider } from './config/ConfigProvider';
import type { ApiService } from './api/ApiService';
import AppContextProvider from './hooks/useAppContext';
import Styles from './components/common/Styles';

import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {
  rootNavigationRef,
  RootStackNavigator,
} from './router/RootStackNavigator';
import { useMemo } from 'react';

type AppProps = {
  configProvider: ConfigProvider;
  apiClient: ApiService;
};

const App = ({ configProvider, apiClient }: AppProps) => {
  const isDark = useColorScheme();

  const theme = useMemo(() => {
    return isDark === 'dark' ? DarkTheme : DefaultTheme;
  }, [isDark]);

  return (
    <NavigationContainer theme={theme} ref={rootNavigationRef}>
      <AppContextProvider
        configProvider={configProvider}
        apiClient={apiClient}
        onError={(error: Error) => {
          Alert.alert('App error', error.message || 'Error');
        }}
        navigationRef={rootNavigationRef}
      >
        <SafeAreaView style={Styles.page}>
          <RootStackNavigator />
        </SafeAreaView>
      </AppContextProvider>
    </NavigationContainer>
  );
};

export default App;
