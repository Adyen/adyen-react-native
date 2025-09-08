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
import { DEFAULT_CONFIGURATION } from './src/Configuration';
import * as Screens from './src/components';

import { Stack } from './src/State/RootStackParamList';
import AppContextProvider from './src/hooks/useAppContext';

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
          <Stack.Screen name="Home" component={Screens.Home} />
          <Stack.Screen
            name="SessionsCheckout"
            component={Screens.SessionsCheckout}
            options={() => ({ title: 'Sessions Checkout' })}
          />
          <Stack.Screen
            name="AdvancedCheckout"
            component={Screens.AdvancedCheckout}
            options={() => ({ title: 'Advanced Checkout' })}
          />
          <Stack.Screen
            name="PartialPaymentCheckout"
            component={Screens.PartialPaymentCheckout}
            options={() => ({ title: 'Partial Payment' })}
          />
          <Stack.Screen name="Settings" component={Screens.SettingView} />
          <Stack.Screen name="Result" component={Screens.ResultView} />
          <Stack.Screen name="CustomCard" component={Screens.CseView} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppContextProvider>
  );
};

export default App;
