import { type NativeModule, NativeModules } from 'react-native';
import type { ConditionalPaymentComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from '../modules/ModuleMock';

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ConditionalPaymentComponent & NativeModule =
  NativeModules.AdyenApplePay ?? ModuleMock;
