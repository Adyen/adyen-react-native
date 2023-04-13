import React from 'react';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Button, Alert, useColorScheme } from 'react-native';
import PaymentMethodsProvider from './Utilities/PaymentMethodsProvider';
import CseView from './Views/CseView';
import SettingView from './Views/SettingsView';
import Result from './Views/ResultView';
import CheckoutView from './Views/Checkout/CheckoutView';
import Home from './Views/HomeView';
import { RootStackParamList } from './@types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <PaymentMethodsProvider
      onError={error => {
        Alert.alert('Payment Methods', error.message || 'Error');
      }}>
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen
            name="Checkout"
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
          <Stack.Screen name="CSE" component={CseView} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaymentMethodsProvider>
  );
};

export default App;
