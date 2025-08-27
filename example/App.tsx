/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';

import { Alert, useColorScheme } from 'react-native';
import CseView from './src/Views/CseView';
import SettingView from './src/Views/SettingsView';
import Result from './src/Views/ResultView';
import SessionsCheckout from './src/Views/Checkout/SessionsCheckout';
import AdvancedCheckout from './src/Views/Checkout/AdvancedCheckout';
import Home from './src/Views/HomeView';
import AppContextProvider from './src/Utilities/AppContext';
import { DEFAULT_CONFIGURATION } from './src/Configuration';
import PartialPaymentCheckout from './src/Views/Checkout/PartialPaymentCheckout';

import { Stack } from './src/State/RootStackParamList';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppContextProvider
      configuration={DEFAULT_CONFIGURATION}
      onError={(error) => {
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
          <Stack.Screen
            name="PartialPaymentCheckout"
            component={PartialPaymentCheckout}
            options={() => ({ title: 'Partial Payment' })}
          />
          <Stack.Screen name="Settings" component={SettingView} />
          <Stack.Screen name="Result" component={Result} />
          <Stack.Screen name="CustomCard" component={CseView} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
