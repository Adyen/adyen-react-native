import type { ResultCode } from '@adyen/react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  SessionsCheckout: undefined;
  AdvancedCheckout: undefined;
  Settings: undefined;
  CustomCard: undefined;
  CardForm: undefined;
  Result: { resultCode: ResultCode };
  PartialPaymentCheckout: undefined;
};

export const Stack = createNativeStackNavigator<RootStackParamList>();

export type PageProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};
