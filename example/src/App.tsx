/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import { Alert, SafeAreaView, useColorScheme } from 'react-native';
import { DEFAULT_CONFIGURATION } from './Configuration';

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

const App = () => {
  const isDark = useColorScheme();

  const theme = useMemo(() => {
    return isDark === 'dark' ? DarkTheme : DefaultTheme;
  }, [isDark]);

  return (
    <NavigationContainer theme={theme} ref={rootNavigationRef}>
      <AppContextProvider
        configuration={DEFAULT_CONFIGURATION}
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
