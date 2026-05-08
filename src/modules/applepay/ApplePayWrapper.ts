import type {
  AdyenActionComponent,
  ApplePayAuthorizationResultRequest,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  Configuration,
  PaymentAction,
  PaymentMethod,
} from '../../core';
import { PaymentComponentWrapper } from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';
import type { PaymentModule } from '../base/PaymentComponentWrapper';

/** Native module interface specific to ApplePay */
interface ApplePayNativeModule extends ApplePayModule, PaymentModule {
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResultRequest): void;
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

  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void {
    this.nativeModule.provideCouponCodeUpdate(update);
  }

  provideAuthorizationResult(result: ApplePayAuthorizationResultRequest): void {
    this.nativeModule.provideAuthorizationResult(result);
  }
}
