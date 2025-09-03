/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';

import { Alert, useColorScheme } from 'react-native';
import Result from './src/Views/ResultView';
import Home from './src/Views/HomeView';
import AppContextProvider from './src/Utilities/AppContext';
import { DEFAULT_CONFIGURATION } from './src/Configuration';
import SettingView from './src/Views/SettingsView';
import SessionsCheckout from './src/Views/Checkout/SessionsCheckout';
import AdvancedCheckout from './src/Views/Checkout/AdvancedCheckout';

import { Stack } from './src/State/RootStackParamList';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppContextProvider
      configuration={DEFAULT_CONFIGURATION}
      onError={(error: Error) => {
        Alert.alert('App error', error.message || 'Error');
      }}
    >
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen
            name="SessionsCheckout"
            component={SessionsCheckout}
            options={() => ({ title: 'Sessions Checkout' })}
          />
          <Stack.Screen
            name="AdvancedCheckout"
            component={AdvancedCheckout}
            options={() => ({ title: 'Advanced Checkout' })}
          />
          <Stack.Screen name="Settings" component={SettingView} />
          <Stack.Screen name="Result" component={Result} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
