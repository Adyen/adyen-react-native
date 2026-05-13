import type {
  AdyenActionComponent,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  Configuration,
  PaymentAction,
  PaymentMethod,
} from '../../core';
import type { ApplePayAuthorizationResult } from './ApplePayInternalTypes';
import { PaymentComponentWrapper } from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';
import type { PaymentModule } from '../base/PaymentComponentWrapper';

/** Native module interface specific to ApplePay */
interface ApplePayNativeModule extends ApplePayModule, PaymentModule {
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}

export class ApplePayWrapper
  extends PaymentComponentWrapper<ApplePayNativeModule>
  implements ApplePayModule, AdyenActionComponent
{
  name: string = 'ApplePay';

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }

  handle(_action: PaymentAction): void {
    if (__DEV__) {
      console.warn(
        'ApplePayWrapper.handle() was called, but Apple Pay does not support action handling. ' +
          'This is likely a bug in your integration.'
      );
    }
  }

  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void {
    this.nativeModule.provideCouponCodeUpdate(update);
  }

  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void {
    this.nativeModule.provideShippingContactUpdate(update);
  }

  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void {
    this.nativeModule.provideShippingMethodUpdate(update);
  }

  provideAuthorizationResult(result: ApplePayAuthorizationResult): void {
    this.nativeModule.provideAuthorizationResult(result);
  }
}
