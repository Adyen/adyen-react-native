import { NativeModules } from 'react-native';
import type { ConditionalPaymentComponent } from '../../core/types';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';

export interface ApplePayModule extends ConditionalPaymentComponent {}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
