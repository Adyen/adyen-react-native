import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';
import type {
  AdyenComponent,
  ApplePayAuthorizationResultRequest,
  ConditionalPaymentComponent,
} from '../../core';

export interface ApplePayModule
  extends AdyenComponent, ConditionalPaymentComponent {
  provideAuthorizationResult(result: ApplePayAuthorizationResultRequest): void;
}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
