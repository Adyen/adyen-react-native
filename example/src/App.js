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
import CheckoutView from './CheckoutView';
import Result from './ResultView';
import PaymentMethodsProvider from './PaymentMethodsProvider';

import { Button, Alert, View } from 'react-native';

const Stack = createNativeStackNavigator();

const Home = ({ navigation }) => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center'}} >
      <Button
        onPress={() => navigation.navigate('CheckoutPage')}
        title="Checkout"
      />
    </View>
  )
}

const App = () => {
  return (
    <PaymentMethodsProvider
      onError={(error) => {
        Alert.alert('Payment Methods', error.message || 'Error');
      }}
    >
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen
            name="CheckoutPage"
            component={CheckoutView}
            options={({ navigation, route }) => ({
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
          <Stack.Screen name="ResultPage" component={Result} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaymentMethodsProvider>
  );
};

export default App;
