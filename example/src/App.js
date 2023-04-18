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
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Button, Alert, useColorScheme } from 'react-native';
import CseView from './Views/CseView';
import SettingView from './Views/SettingsView';
import Result from './Views/ResultView';
import CheckoutView from './Views/Checkout/CheckoutView';
import Home from './Views/HomeView';
import AppContextProvider from './Utilities/AppContext';

const Stack = createNativeStackNavigator();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppContextProvider
      onError={(error) => {
        Alert.alert('Payment Methods', error.message || 'Error');
      }}
    >
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen
            name="CheckoutPage"
            component={CheckoutView}
            options={({ navigation }) => ({
              title: 'Adyen React Native',
              headerRight: () => (
                <Button
                  onPress={() => navigation.navigate('Settings')}
                  title="Edit"
                />
              ),
            })}
          />
          <Stack.Screen name="Settings" component={SettingView} />
          <Stack.Screen name="Result" component={Result} />
          <Stack.Screen name="Clientside Encryption" component={CseView} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
