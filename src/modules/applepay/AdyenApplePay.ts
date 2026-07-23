import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';
import type {
  AdyenComponent,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  ConditionalPaymentComponent,
} from '../../core';

export interface ApplePayModule
  extends AdyenComponent, ConditionalPaymentComponent {
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
