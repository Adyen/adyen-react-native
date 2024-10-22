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
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {Button, Alert, useColorScheme} from 'react-native';
import CseView from './src/Views/CseView';
import SettingView from './src/Views/SettingsView';
import Result from './src/Views/ResultView';
import SessionsCheckout from './src/Views/Checkout/SessionsCheckout';
import AdvancedCheckout from './src/Views/Checkout/AdvancedCheckout';
import Home from './src/Views/HomeView';
import AppContextProvider from './src/Utilities/AppContext';
import {DEFAULT_CONFIGURATION} from './src/Configuration';
import PartialPaymentCheckout from './src/Views/Checkout/PartialPaymentCheckout';

const Stack = createNativeStackNavigator();

const SettingsButton = ({navigation}) => {
  return (
    <Button onPress={() => navigation.navigate(Page.Settings)} title="Edit" />
  );
};

export const Page = {
  Home: 'Home',
  SessionsCheckout: 'SessionsCheckout',
  AdvancedCheckout: 'AdvancedCheckout',
  Settings: 'Settings',
  CustomCard: 'CustomCard',
  Result: 'Result',
  PartialPaymentCheckout: 'PartialPaymentCheckout'
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppContextProvider
      configuration={DEFAULT_CONFIGURATION}
      onError={error => {
        Alert.alert('App error', error.message || 'Error');
      }}>
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack.Navigator>
          <Stack.Screen
            name={Page.Home}
            component={Home}
            options={({navigation}) => ({
              headerRight: () => <SettingsButton navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name={Page.SessionsCheckout}
            component={SessionsCheckout}
            options={() => ({title: 'Sessions Checkout'})}
          />
          <Stack.Screen
            name={Page.AdvancedCheckout}
            component={AdvancedCheckout}
            options={() => ({title: 'Advanced Checkout'})}
          />
           <Stack.Screen
            name={Page.PartialPaymentCheckout}
            component={PartialPaymentCheckout}
            options={() => ({title: 'Partial Payment'})}
          />
          <Stack.Screen name={Page.Settings} component={SettingView} />
          <Stack.Screen name={Page.Result} component={Result} />
          <Stack.Screen name={Page.CustomCard} component={CseView} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
