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

import { Alert, SafeAreaView, useColorScheme } from 'react-native';
import { DEFAULT_CONFIGURATION } from './Configuration';
import * as Screens from './components';

import { Stack } from './State/RootStackParamList';
import AppContextProvider from './hooks/useAppContext';
import Styles from './components/common/Styles';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <AppContextProvider
      configuration={DEFAULT_CONFIGURATION}
      onError={(error: Error) => {
        Alert.alert('App error', error.message || 'Error');
      }}
    >
      <SafeAreaView style={Styles.page}>
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
      </SafeAreaView>
    </AppContextProvider>
  );
};

export default App;
