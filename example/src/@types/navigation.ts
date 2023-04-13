import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Checkout: undefined;
  Settings: undefined;
  Result: { result: string };
  CSE: undefined;
};

export type HomeScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Home'
>;

export type CheckoutScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Checkout'
>;

export type SettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Settings'
>;

export type ResultScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

export type CSEScreenProps = NativeStackScreenProps<RootStackParamList, 'CSE'>;
