import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';
import type { AdyenComponent, ConditionalPaymentComponent } from '../../core';
import type { ApplePayAuthorizationResult } from './ApplePayInternalTypes';

export interface ApplePayModule
  extends AdyenComponent, ConditionalPaymentComponent {
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
