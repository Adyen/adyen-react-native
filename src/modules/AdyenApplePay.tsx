import { type NativeModule, NativeModules } from 'react-native';
import type { AdyenComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from '../modules/ModuleMock';

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: AdyenComponent & NativeModule =
  NativeModules.AdyenApplePay ?? ModuleMock;
