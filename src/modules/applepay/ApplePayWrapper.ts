import type {
  AdyenActionComponent,
  Configuration,
  PaymentAction,
  PaymentMethod,
} from '../../core';
import { PaymentComponentWrapper } from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';
import type { PaymentModule } from '../base/PaymentComponentWrapper';

/** Native module interface specific to ApplePay */
interface ApplePayNativeModule extends ApplePayModule, PaymentModule {
  // TODO: add express payment events
}

/**
 * Apple Pay wrapper - no additional events beyond inherited ones.
 * @warning handle() implementation throws an exception as Apple Pay doesn't support action handling.
 * @todo add express payment events
 */
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
    throw new Error(ACTIONS_NOT_SUPPORTED_ERROR);
  }
}

const ACTIONS_NOT_SUPPORTED_ERROR =
  'Apple Pay does not support action handling.';
