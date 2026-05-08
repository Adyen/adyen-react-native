import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { ApplePayWrapper } from './ApplePayWrapper';
import type {
  AdyenComponent,
  ConditionalPaymentComponent,
  ApplePayAuthorizationResultRequest,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
} from '../../core';

export interface ApplePayModule
  extends AdyenComponent, ConditionalPaymentComponent {
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResultRequest): void;
}

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: ApplePayModule = new ApplePayWrapper(
  NativeModules.AdyenApplePay ?? ModuleMock
);
