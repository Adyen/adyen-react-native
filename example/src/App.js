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
import { DEFAULT_CONFIGURATION } from './Configuration';

const Stack = createNativeStackNavigator();

const SettingsButton = ({ navigation }) => {
  return (
    <Button onPress={() => navigation.navigate('Settings')} title="Edit" />
  );
};
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
            name="CheckoutPage"
            component={CheckoutView}
            options={({ navigation }) => ({
              title: 'Checkout',
              headerRight: (props) => (
                <SettingsButton navigation={navigation} {...props} />
              ),
            })}
          />
          <Stack.Screen name="Settings" component={SettingView} />
          <Stack.Screen name="Result" component={Result} />
          <Stack.Screen
            name="Clientside Encryption"
            component={CseView}
            options={({ navigation }) => ({
              title: 'Clientside Encryption',
              headerRight: (props) => (
                <SettingsButton navigation={navigation} {...props} />
              ),
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
