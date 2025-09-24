import { type NativeModule, NativeModules } from 'react-native';
import type {
  AdyenActionComponent,
  ConditionalPaymentComponent,
} from '../core/AdyenNativeModules';
import { ModuleMock } from '../modules/ModuleMock';

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenActionComponent &
  NativeModule &
  ConditionalPaymentComponent = NativeModules.AdyenGooglePay ?? ModuleMock;
