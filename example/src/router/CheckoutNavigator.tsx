import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import PaymentMethodsView from '../components/Checkout/components/PaymentMethodsView';
import * as Screens from '../components';
import { modalScreenOptions } from './modalScreenOptions';

// Checkout stack screens (for CardForm modal)
export type CheckoutStackParamList = {
  PaymentMethods: {
    showDropIn?: boolean;
    showEmbeddedComponents?: boolean;
    showDropBasedComponents?: boolean;
  };
  CardForm: undefined;
};

export const CheckoutStack =
  createNativeStackNavigator<CheckoutStackParamList>();

export type CheckoutStackNavigationProp =
  NativeStackNavigationProp<CheckoutStackParamList>;

export interface CheckoutNavigatorProps {
  showDropIn?: boolean;
  showEmbeddedComponents?: boolean;
  showDropBasedComponents?: boolean;
}

// Generic Checkout Navigator with CardForm modal
export const CheckoutNavigator = (prop: CheckoutNavigatorProps) => {
  const { showDropIn, showEmbeddedComponents, showDropBasedComponents } = prop;

  return (
    <CheckoutStack.Navigator>
      <CheckoutStack.Screen
        name="PaymentMethods"
        component={PaymentMethodsView}
        initialParams={{
          showDropIn,
          showEmbeddedComponents,
          showDropBasedComponents,
        }}
        options={{ headerShown: false }}
      />
      <CheckoutStack.Screen
        name="CardForm"
        component={Screens.CardsForm}
        options={{
          ...modalScreenOptions,
          title: 'Card Form',
        }}
      />
    </CheckoutStack.Navigator>
  );
};
