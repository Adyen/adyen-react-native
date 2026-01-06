import type { Configuration, PaymentMethod } from '../../core';
import { PaymentComponentWrapper } from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';
import type { PaymentModule } from '../base/PaymentComponentWrapper';

/** Native module interface specific to ApplePay */
interface ApplePayNativeModule extends ApplePayModule, PaymentModule {
  // TODO: add express payment events
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
