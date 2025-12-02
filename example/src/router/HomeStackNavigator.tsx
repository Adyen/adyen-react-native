import { Button } from 'react-native';
import * as Screens from '../components';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppContext } from '../hooks/useAppContext';

export const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// Home stack screens (main navigation with back button)
export type HomeStackParamList = {
  Home: undefined;
  SessionsCheckout: undefined;
  AdvancedCheckout: undefined;
  PartialPaymentCheckout: undefined;
  CustomCard: undefined;
};

// Home stack with main navigation (back button navigation)
export const HomeStackNavigator = () => {
  const { navigateToSettings } = useAppContext();

  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={Screens.Home}
        options={{
          headerRight: () => (
            <Button title="Settings" onPress={navigateToSettings} />
          ),
        }}
      />
      <HomeStack.Screen
        name="SessionsCheckout"
        component={Screens.SessionsCheckout}
        options={{ title: 'Sessions Checkout' }}
      />
      <HomeStack.Screen
        name="AdvancedCheckout"
        component={Screens.AdvancedCheckout}
        options={{ title: 'Advanced Checkout' }}
      />
      <HomeStack.Screen
        name="PartialPaymentCheckout"
        component={Screens.PartialPaymentCheckout}
        options={{ title: 'Partial Payment' }}
      />
      <HomeStack.Screen
        name="CustomCard"
        component={Screens.CseView}
        options={{ title: 'Custom Card' }}
      />
    </HomeStack.Navigator>
  );
};
