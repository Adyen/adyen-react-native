import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';
import type { PaymentModule } from '../base/PaymentComponentWrapper';
import type { ConditionalPaymentComponent } from '../../core';

export interface ApplePayModule
  extends PaymentModule, ConditionalPaymentComponent {}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
