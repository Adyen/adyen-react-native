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
import SettingView from './SettingsView';
import CheckoutView from './CheckoutView';
import Result from './ResultView';
import CseView from './CSE';
import PaymentMethodsProvider from './PaymentMethodsProvider';

import { Button, Alert, View, useColorScheme } from 'react-native';

const Stack = createNativeStackNavigator();

const Home = ({ navigation }) => {
  return (
    <View
      style={{
        flex: 1,
        alignContent: 'center',
        padding: 40,
      }}
    >
      <View
        style={{
          flex: 1,
          alignContent: 'stretch',
          justifyContent: 'center',
        }}
      >
        <Button
          onPress={() => navigation.navigate('CheckoutPage')}
          title="Checkout"
        />
        <Button
          onPress={() => navigation.navigate('Clientside Encryption')}
          title="Clientside Encryption"
        />
      </View>
    </View>
  );
};

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <PaymentMethodsProvider
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
    </PaymentMethodsProvider>
  );
};

export default App;
