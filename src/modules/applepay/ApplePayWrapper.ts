import type {
  ConditionalPaymentComponent,
  Configuration,
  PaymentMethod,
} from '../../core';
import {
  PaymentComponentWrapper,
  type PaymentModule,
} from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';

/** Native module interface specific to ApplePay */
export interface ApplePayNativeModule
  extends PaymentModule, ConditionalPaymentComponent {
  isAvailable(
    paymentMethod: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}

/**
 * Apple Pay wrapper - no additional events beyond inherited ones.
 * TODO: add express payment events
 */
export class ApplePayWrapper
  extends PaymentComponentWrapper<ApplePayNativeModule>
  implements ApplePayModule
{
  name: string = 'ApplePay';

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
