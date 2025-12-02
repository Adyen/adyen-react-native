import * as Screens from '../components';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { modalScreenOptions } from './modalScreenOptions';
import PaymentMethodsView from '../components/Checkout/components/PaymentMethodsView';

// Checkout stack screens (for CardForm modal)
export type CheckoutStackParamList = {
  PaymentMethods: { showComponents: boolean };
  CardForm: undefined;
};

export const CheckoutStack =
  createNativeStackNavigator<CheckoutStackParamList>();

export type CheckoutStackNavigationProp =
  NativeStackNavigationProp<CheckoutStackParamList>;

export interface CheckoutNavigatorProps {
  showComponents: boolean;
}

// Generic Checkout Navigator with CardForm modal
export const CheckoutNavigator = ({
  showComponents,
}: CheckoutNavigatorProps) => {
  return (
    <CheckoutStack.Navigator>
      <CheckoutStack.Screen
        name="PaymentMethods"
        component={PaymentMethodsView}
        initialParams={{ showComponents }}
        options={{ headerShown: false }}
      />
      <CheckoutStack.Screen
        name="CardForm"
        component={Screens.CardForm}
        options={{
          ...modalScreenOptions,
          title: 'Card Form',
        }}
      />
    </CheckoutStack.Navigator>
  );
};
