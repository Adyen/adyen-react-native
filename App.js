/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingView from './SettingsView';
import PaymentView from './PaymentView';
import PaymentMethodsProvider from './PaymentMethodsProvider';

import { Button } from 'react-native';

const Stack = createNativeStackNavigator();

const App = () => {

  return ( 
    <PaymentMethodsProvider>
      <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={PaymentView} options={ ({ navigation, route }) => ({
            title: 'Adyen React Native',
            headerRight: () => (
              <Button onPress={() => navigation.navigate('Settings') } title="Edit" />
            ),
          })
          } />
        <Stack.Screen name="Settings" component={SettingView} />
      </Stack.Navigator>
    </NavigationContainer>
  </PaymentMethodsProvider>
   )
};

export default App;
